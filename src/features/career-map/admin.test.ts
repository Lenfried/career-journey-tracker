import { describe, expect, it } from 'vitest'
import type {
  CareerAction,
  CareerMap,
  CareerSpecialization,
  StudentRecord,
} from '@/lib/canonical'
import {
  addRequiredSkill,
  applyMapPlacements,
  applySpecializationOverlay,
  createCareerAction,
  createCareerSpecialization,
  deleteCareerAction,
  deleteCareerSpecialization,
  describeActionUsage,
  describeSpecializationUsage,
  removeRequiredSkill,
  slugify,
  updateCareerAction,
  updateCareerSpecializationDetails,
  type SpecializationOverride,
} from './admin'

const action = (
  id: string,
  overrides: Partial<CareerAction> = {},
): CareerAction => ({
  id,
  title: `Do ${id}`,
  why: 'Because.',
  categoryId: 'cat_advising',
  targetCount: 1,
  evidence: null,
  resourceUrl: null,
  ...overrides,
})

const MAP: CareerMap = {
  id: 'map_general',
  version: 1,
  label: 'General',
  description: 'The general map.',
  lastReviewed: '2026-09-16',
  placements: [
    { actionId: 'act_a', term: 'y1-fall' },
    { actionId: 'act_b', term: 'y2-fall' },
  ],
}

const SPECIALIZATION: CareerSpecialization = {
  id: 'specialization_backend',
  trackId: 'track_software_engineering',
  label: 'Backend engineering',
  description: 'Backend focus.',
  placements: [{ actionId: 'act_c', term: 'y2-fall' }],
  excludes: ['act_b'],
  requiredSkills: [
    {
      id: 'skill_sql',
      name: 'SQL',
      category: 'technical',
      importance: 'essential',
      rationale: null,
    },
  ],
}

const student = (overrides: Partial<StudentRecord> = {}): StudentRecord =>
  ({
    id: 'stu_test',
    careerMap: {
      trackId: null,
      trackSetAt: null,
      specializationId: null,
      specializationSetAt: null,
      progress: [],
    },
    ...overrides,
  }) as StudentRecord

describe('slugify', () => {
  it('lowercases and underscores a label', () => {
    expect(slugify('act_', 'Meet your advisor', [])).toBe(
      'act_meet_your_advisor',
    )
  })

  it('disambiguates against existing ids', () => {
    expect(
      slugify('act_', 'Meet your advisor', ['act_meet_your_advisor']),
    ).toBe('act_meet_your_advisor_2')
    expect(
      slugify('act_', 'Meet your advisor', [
        'act_meet_your_advisor',
        'act_meet_your_advisor_2',
      ]),
    ).toBe('act_meet_your_advisor_3')
  })

  it('strips punctuation rather than carrying it into the id', () => {
    expect(slugify('act_', 'Build a résumé — draft #1!', [])).toContain('act_')
    expect(slugify('act_', 'Build a résumé — draft #1!', [])).not.toMatch(
      /[^a-z0-9_]/,
    )
  })
})

describe('createCareerAction / updateCareerAction / deleteCareerAction', () => {
  const catalog = [action('act_a')]
  const input = {
    title: 'New action',
    why: 'Reason.',
    categoryId: 'cat_advising',
    targetCount: 1,
    evidence: null,
    resourceUrl: null,
  }

  it('adds a new action with a generated id', () => {
    const next = createCareerAction(catalog, input)
    expect(next).toHaveLength(2)
    expect(next[1]?.id).toBe('act_new_action')
    expect(catalog).toHaveLength(1) // input untouched
  })

  it('updates only the matching action', () => {
    const next = updateCareerAction(catalog, 'act_a', {
      ...input,
      title: 'Renamed',
    })
    expect(next[0]?.title).toBe('Renamed')
    expect(next[0]?.id).toBe('act_a')
  })

  it('deletes only the matching action', () => {
    const next = deleteCareerAction([action('act_a'), action('act_b')], 'act_a')
    expect(next.map((a) => a.id)).toEqual(['act_b'])
  })
})

describe('describeActionUsage', () => {
  it('is null when nothing references the action', () => {
    expect(
      describeActionUsage('act_unused', MAP, [SPECIALIZATION], []),
    ).toBeNull()
  })

  it('reports the general map, tracks and students that reference it', () => {
    const students = [
      student({
        careerMap: {
          trackId: null,
          trackSetAt: null,
          specializationId: null,
          specializationSetAt: null,
          progress: [
            {
              actionId: 'act_a',
              status: 'done',
              completedCount: 1,
              movedToTerm: null,
              moveReasonId: null,
              markedBy: 'x',
              markedAt: '2026-01-01T00:00:00.000Z',
              note: null,
            },
          ],
        },
      }),
    ]

    const usage = describeActionUsage('act_a', MAP, [SPECIALIZATION], students)
    expect(usage).toContain('general map')
    expect(usage).toContain('1 student')
  })

  it('reports a specialization that only excludes the action', () => {
    expect(describeActionUsage('act_b', MAP, [SPECIALIZATION], [])).toContain(
      'Backend engineering',
    )
  })
})

describe('applyMapPlacements', () => {
  it('replaces placements from a full assignment map', () => {
    const next = applyMapPlacements(
      MAP,
      new Map([
        ['act_a', 'y1-spring'],
        ['act_b', null],
      ]),
    )
    expect(next.placements).toEqual([{ actionId: 'act_a', term: 'y1-spring' }])
    expect(next.version).toBe(2)
  })

  it('does not bump the version when nothing actually changed', () => {
    const next = applyMapPlacements(
      MAP,
      new Map([
        ['act_a', 'y1-fall'],
        ['act_b', 'y2-fall'],
      ]),
    )
    expect(next).toBe(MAP)
    expect(next.version).toBe(1)
  })
})

describe('career specialization details', () => {
  it('creates a specialization with empty overlays and a generated id', () => {
    const next = createCareerSpecialization([SPECIALIZATION], {
      trackId: 'track_cybersecurity',
      label: 'Security',
      description: 'Cyber focus.',
    })
    const created = next[1]
    expect(created?.id).toBe('specialization_security')
    expect(created?.trackId).toBe('track_cybersecurity')
    expect(created?.placements).toEqual([])
    expect(created?.excludes).toEqual([])
    expect(created?.requiredSkills).toEqual([])
  })

  it('updates label and description without touching overlays', () => {
    const next = updateCareerSpecializationDetails(
      [SPECIALIZATION],
      'specialization_backend',
      {
        trackId: 'track_software_engineering',
        label: 'Platform engineering',
        description: 'Updated.',
      },
    )
    expect(next[0]?.label).toBe('Platform engineering')
    expect(next[0]?.placements).toEqual(SPECIALIZATION.placements)
  })

  it('deletes only the matching specialization', () => {
    const next = deleteCareerSpecialization(
      [SPECIALIZATION],
      'specialization_backend',
    )
    expect(next).toEqual([])
  })
})

describe('describeSpecializationUsage', () => {
  it('is null when no student is in the specialization', () => {
    expect(
      describeSpecializationUsage('specialization_backend', [student()]),
    ).toBeNull()
  })

  it('counts students currently in the specialization', () => {
    const students = [
      student({
        careerMap: {
          trackId: 'track_software_engineering',
          trackSetAt: '2026-01-01T00:00:00.000Z',
          specializationId: 'specialization_backend',
          specializationSetAt: '2026-01-01T00:00:00.000Z',
          progress: [],
        },
      }),
      student({
        careerMap: {
          trackId: 'track_software_engineering',
          trackSetAt: '2026-01-01T00:00:00.000Z',
          specializationId: 'specialization_backend',
          specializationSetAt: '2026-01-01T00:00:00.000Z',
          progress: [],
        },
      }),
      student(),
    ]
    expect(
      describeSpecializationUsage('specialization_backend', students),
    ).toContain('2 student')
  })
})

describe('applySpecializationOverlay', () => {
  it('rebuilds placements and excludes from a full override map', () => {
    const next = applySpecializationOverlay(
      SPECIALIZATION,
      new Map<string, SpecializationOverride>([
        ['act_a', 'excluded'],
        ['act_b', 'default'], // clears the existing exclude
        ['act_c', 'y3-fall'],
      ]),
    )
    expect(next.excludes).toEqual(['act_a'])
    expect(next.placements).toEqual([{ actionId: 'act_c', term: 'y3-fall' }])
  })
})

describe('addRequiredSkill / removeRequiredSkill', () => {
  it('adds a skill with a generated id', () => {
    const next = addRequiredSkill(SPECIALIZATION, {
      name: 'Distributed systems',
      category: 'technical',
      importance: 'important',
      rationale: null,
    })
    expect(next.requiredSkills).toHaveLength(2)
    expect(next.requiredSkills[1]?.id).toBe('skill_distributed_systems')
  })

  it('removes only the matching skill', () => {
    const next = removeRequiredSkill(SPECIALIZATION, 'skill_sql')
    expect(next.requiredSkills).toEqual([])
  })
})
