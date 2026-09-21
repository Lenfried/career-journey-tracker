import { beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from '../../../fixtures/students.json'
import { canonicalDatasetSchema, type CanonicalDataset } from '@/lib/canonical'
import { loadDataset, saveDataset } from '@/lib/fixtures'
import { writeAudit } from '@/lib/audit'
import { recordAdvisingUpdate } from './advising-update'
import { updateActionProgress } from '@/features/career-map/progress'
import { updateStudentSkill } from '@/features/skills/mutations'
import {
  deriveSkillsView,
  mergeRequiredSkills,
} from '@/features/skills/queries'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/audit', () => ({ writeAudit: vi.fn() }))
vi.mock('@/lib/fixtures', () => ({
  loadDataset: vi.fn(),
  saveDataset: vi.fn(),
}))

const actor = {
  id: 'demo_advisor',
  displayName: 'Demo Advisor',
  role: 'career-advisor' as const,
}
let dataset: CanonicalDataset
const studentId = 'stu_advisor_test'
const actionId = 'act_progress_test'

beforeEach(() => {
  vi.clearAllMocks()
  dataset = canonicalDatasetSchema.parse(structuredClone(fixture))
  const student = dataset.students[0]!
  student.id = studentId
  student.notes = []
  student.skills = []
  student.requiredSkills = []
  student.careerMap = {
    trackId: null,
    trackSetAt: null,
    specializationId: null,
    specializationSetAt: null,
    progress: [
      {
        actionId,
        status: 'in-progress',
        completedCount: 1,
        movedToTerm: 'y3-fall',
        moveReasonId: dataset.lookups.moveReasons[0]!.id,
        markedBy: 'Demo Advisor',
        markedAt: '2026-01-01T00:00:00.000Z',
        note: 'Earlier reason.',
      },
    ],
  }
  dataset.students = [student]
  dataset.careerActions.push({
    id: actionId,
    title: 'Test repeated action',
    why: 'Test',
    categoryId: dataset.lookups.actionCategories[0]!.id,
    targetCount: 3,
    evidence: null,
    resourceUrl: null,
  })
  dataset.careerMaps[0]!.placements.push({ actionId, term: 'y2-fall' })
  vi.mocked(loadDataset).mockImplementation(() => dataset)
  vi.mocked(saveDataset).mockImplementation((value) => {
    dataset = canonicalDatasetSchema.parse(value)
  })
})

function form(values: Record<string, string> = {}) {
  const data = new FormData()
  for (const [key, value] of Object.entries({
    sessionDate: '2026-09-17',
    typeId: dataset.lookups.noteTypes[0]!.id,
    content: 'Reviewed during the advising session.',
    followUpDate: '2026-10-01',
    ...values,
  }))
    data.set(key, value)
  return data
}

function progress(data: FormData, id = actionId) {
  return recordAdvisingUpdate(
    actor,
    studentId,
    data,
    'student.progress.update',
    (current, student, now) =>
      updateActionProgress(
        current,
        student,
        id,
        Object.fromEntries(data),
        String(data.get('content')),
        actor.displayName,
        now,
      ),
  )
}

function skill(
  data: FormData,
  list: 'held' | 'required' = 'held',
  id: string | null = null,
) {
  return recordAdvisingUpdate(
    actor,
    studentId,
    data,
    'student.skill.update',
    (_current, student) =>
      updateStudentSkill(
        student,
        list,
        id,
        String(data.get('intent')),
        Object.fromEntries(data),
      ),
  )
}

describe('advisor progress and skill transactions', () => {
  it('saves completion and a dated explanatory note together, preserving the scheduled move', async () => {
    expect(
      await progress(form({ status: 'done', completedCount: '0' })),
    ).toHaveProperty('success')
    expect(saveDataset).toHaveBeenCalledTimes(1)
    const student = dataset.students[0]!
    expect(student.careerMap.progress[0]).toMatchObject({
      status: 'done',
      completedCount: 3,
      movedToTerm: 'y3-fall',
      moveReasonId: dataset.lookups.moveReasons[0]!.id,
      markedBy: actor.displayName,
    })
    expect(student.notes[0]).toMatchObject({
      sessionDate: '2026-09-17',
      followUpDate: '2026-10-01',
      recordedBy: actor.displayName,
    })
    expect(student.notes[0]!.content).toContain('Test repeated action')
    expect(student.notes[0]!.content).toContain('(1/3) →')
    expect(student.notes[0]!.content).toContain(
      'Reason: Reviewed during the advising session.',
    )
    expect(writeAudit).toHaveBeenCalledWith({
      actorId: actor.id,
      action: 'student.progress.update',
      studentId,
      recordId: actionId,
    })
  })

  it('keeps earlier notes when progress is reopened or waived and clears completed counts', async () => {
    await progress(form({ status: 'done', completedCount: '3' }))
    await progress(form({ status: 'not-started', completedCount: '3' }))
    await progress(form({ status: 'not-applicable', completedCount: '3' }))
    expect(dataset.students[0]!.careerMap.progress).toHaveLength(1)
    expect(dataset.students[0]!.careerMap.progress[0]).toMatchObject({
      status: 'not-applicable',
      completedCount: 0,
    })
    expect(dataset.students[0]!.notes).toHaveLength(3)
  })

  it.each<Record<string, string>>([
    { content: '   ', status: 'done', completedCount: '3' },
    { sessionDate: '2026-02-30', status: 'done', completedCount: '3' },
    { typeId: 'missing', status: 'done', completedCount: '3' },
    { status: 'invalid', completedCount: '1' },
    { status: 'in-progress', completedCount: '-1' },
    { status: 'in-progress', completedCount: '1.5' },
    { status: 'in-progress', completedCount: '3' },
  ])(
    'rejects invalid session or progress input without writing either record (%#)',
    async (values) => {
      expect(await progress(form(values))).toHaveProperty('error')
      expect(saveDataset).not.toHaveBeenCalled()
      expect(writeAudit).not.toHaveBeenCalled()
    },
  )

  it('rejects actions removed from the current student map', async () => {
    dataset.careerMaps[0]!.placements =
      dataset.careerMaps[0]!.placements.filter(
        (item) => item.actionId !== actionId,
      )
    expect(
      await progress(form({ status: 'done', completedCount: '3' })),
    ).toHaveProperty('error')
    expect(saveDataset).not.toHaveBeenCalled()
  })

  it('assigns a requirement, records the matching held skill, edits it and removes it with notes for every change', async () => {
    await skill(
      form({
        intent: 'save',
        name: 'SQL',
        category: 'technical',
        importance: 'essential',
        rationale: 'Practice database work.',
      }),
      'required',
    )
    await skill(
      form({
        intent: 'save',
        name: ' sql ',
        category: 'technical',
        proficiency: 'beginner',
        evidence: 'Practice project.',
      }),
    )
    const id = dataset.students[0]!.skills[0]!.id
    expect(
      deriveSkillsView(
        dataset.students[0]!.skills,
        dataset.students[0]!.requiredSkills,
      ).gap,
    ).toHaveLength(0)
    await skill(
      form({
        intent: 'save',
        name: 'SQL',
        category: 'technical',
        proficiency: 'advanced',
        evidence: 'Reviewed project.',
        verifiedByAdvisor: 'on',
      }),
      'held',
      id,
    )
    expect(dataset.students[0]!.skills[0]).toMatchObject({
      id,
      proficiency: 'advanced',
      verifiedByAdvisor: true,
    })
    await skill(form({ intent: 'remove' }), 'held', id)
    expect(dataset.students[0]!.skills).toHaveLength(0)
    expect(dataset.students[0]!.requiredSkills).toHaveLength(1)
    expect(dataset.students[0]!.notes).toHaveLength(4)
    expect(
      deriveSkillsView([], dataset.students[0]!.requiredSkills).gap,
    ).toHaveLength(1)
  })

  it('rejects normalized duplicate skill names and missing skills without appending a note', async () => {
    await skill(
      form({
        intent: 'save',
        name: 'SQL',
        category: 'technical',
        proficiency: 'beginner',
        evidence: '',
      }),
    )
    vi.mocked(saveDataset).mockClear()
    expect(
      await skill(
        form({
          intent: 'save',
          name: ' sql ',
          category: 'technical',
          proficiency: 'beginner',
          evidence: '',
        }),
      ),
    ).toHaveProperty('error')
    expect(
      await skill(form({ intent: 'remove' }), 'held', 'missing'),
    ).toHaveProperty('error')
    expect(saveDataset).not.toHaveBeenCalled()
    expect(dataset.students[0]!.notes).toHaveLength(1)
  })

  it('preserves shared specialization requirements when a personal override is removed', async () => {
    const shared = dataset.careerSpecializations[0]!.requiredSkills[0]!
    await skill(
      form({
        intent: 'save',
        name: shared.name,
        category: shared.category,
        importance: 'important',
        rationale: '',
      }),
      'required',
    )
    const id = dataset.students[0]!.requiredSkills[0]!.id
    expect(
      mergeRequiredSkills([shared], dataset.students[0]!.requiredSkills)[0]!
        .source,
    ).toBe('student')
    await skill(form({ intent: 'remove' }), 'required', id)
    expect(
      mergeRequiredSkills([shared], dataset.students[0]!.requiredSkills)[0]!
        .source,
    ).toBe('specialization')
    expect(
      await skill(form({ intent: 'remove' }), 'required', shared.id),
    ).toHaveProperty('error')
    expect(dataset.careerSpecializations[0]!.requiredSkills[0]).toEqual(shared)
  })
})
