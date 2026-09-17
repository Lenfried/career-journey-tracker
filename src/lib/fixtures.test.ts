import { describe, expect, it } from 'vitest'
import {
  ARTIFACT_STATUSES,
  CAREER_MAP_TERMS,
  canonicalDatasetSchema,
  studentCareerMapSchema,
} from './canonical'
import {
  loadCareerActions,
  loadCareerSpecializations,
  loadCareerTracks,
  loadDataset,
  loadLookups,
  loadStudents,
} from './fixtures'
import { academicTermForDate, enrollmentTermsBetween } from './terms'

/**
 * These tests guard the fixture set itself, not the code that reads it.
 *
 * The fixture file is the whole team's development dataset and every student in
 * it is carrying a display state the UI has to handle. Delete the student with
 * no career goal and the goals empty state quietly stops being exercised —
 * nothing fails, and the bug surfaces in an advisor review session instead.
 * These assertions make that deletion fail loudly.
 *
 * Section 7 of the fixture-driven development plan is the source of this list.
 */
describe('fixture dataset', () => {
  it('validates against the canonical schema', () => {
    expect(() => loadDataset()).not.toThrow()
  })

  it('holds 15-25 students', () => {
    const count = loadStudents().length
    expect(count).toBeGreaterThanOrEqual(15)
    expect(count).toBeLessThanOrEqual(25)
  })

  it('gives every student a unique id and EMPLID', () => {
    const students = loadStudents()
    expect(new Set(students.map((s) => s.id)).size).toBe(students.length)
    expect(new Set(students.map((s) => s.emplid)).size).toBe(students.length)
  })

  it('references only lookup ids that exist', () => {
    const lookups = loadLookups()
    const ids = (items: { id: string }[]) => new Set(items.map((i) => i.id))

    const programs = ids(lookups.programs)
    const noteTypes = ids(lookups.noteTypes)
    const milestoneTypes = ids(lookups.milestoneTypes)
    const artifactTypes = ids(lookups.artifactTypes)

    for (const student of loadStudents()) {
      expect(programs).toContain(student.programId)
      for (const note of student.notes) {
        expect(noteTypes).toContain(note.typeId)
      }
      for (const milestone of student.milestones) {
        expect(milestoneTypes).toContain(milestone.typeId)
      }
      for (const artifact of student.artifacts) {
        expect(artifactTypes).toContain(artifact.typeId)
      }
    }
  })

  it('keeps every record obviously fictional', () => {
    // A screenshot of this application must never be mistakable for real FERPA
    // records. `.invalid` is reserved by RFC 2606 and can never be a real
    // domain; the 99xxxxxx EMPLID block is not issued.
    for (const student of loadStudents()) {
      expect(student.email).toMatch(/@demo\.invalid$/)
      expect(student.emplid).toMatch(/^99\d{6}$/)
    }
  })
})

describe('required scenario coverage', () => {
  const students = loadStudents()
  const best = ARTIFACT_STATUSES[ARTIFACT_STATUSES.length - 1]

  it('covers a student with everything complete', () => {
    expect(
      students.filter(
        (s) =>
          s.goal?.confidence === 'high' &&
          s.milestones.length >= 5 &&
          s.artifacts.length === 4 &&
          s.artifacts.every((a) => a.status === best),
      ),
    ).not.toHaveLength(0)
  })

  it('covers a student with nothing started', () => {
    expect(
      students.filter(
        (s) =>
          s.goal === null &&
          s.milestones.length === 0 &&
          s.notes.length === 0 &&
          s.skills.length === 0 &&
          s.artifacts.every((a) => a.status === 'none'),
      ),
    ).not.toHaveLength(0)
  })

  it('covers a student with no career goal set', () => {
    expect(students.filter((s) => s.goal === null)).not.toHaveLength(0)
  })

  it('covers a student with a large skills gap', () => {
    expect(
      students.filter(
        (s) => s.requiredSkills.length >= 8 && s.skills.length <= 2,
      ),
    ).not.toHaveLength(0)
  })

  it('covers a student with a preferred name', () => {
    expect(students.filter((s) => s.preferredName !== null)).not.toHaveLength(0)
  })

  it('covers a student with long content', () => {
    expect(
      students.filter((s) => s.notes.some((n) => n.content.length > 800)),
    ).not.toHaveLength(0)
    expect(
      students.filter((s) => s.milestones.some((m) => m.title.length > 100)),
    ).not.toHaveLength(0)
  })

  it('covers a student with partial data', () => {
    // Fewer artifact rows than artifact types — the service layer has to fill
    // the missing ones in rather than rendering a short checklist.
    const artifactTypeCount = loadLookups().artifactTypes.length
    expect(
      students.filter(
        (s) => s.artifacts.length > 0 && s.artifacts.length < artifactTypeCount,
      ),
    ).not.toHaveLength(0)
  })

  it('covers a student with exactly one of each list', () => {
    expect(
      students.filter(
        (s) =>
          s.notes.length === 1 &&
          s.milestones.length === 1 &&
          s.skills.length === 1,
      ),
    ).not.toHaveLength(0)
  })

  it('covers every classification', () => {
    for (const classification of [
      'freshman',
      'sophomore',
      'junior',
      'senior',
    ] as const) {
      expect(
        students.filter((s) => s.classification === classification),
      ).not.toHaveLength(0)
    }
  })

  it('covers every enrollment status', () => {
    for (const status of [
      'enrolled',
      'leave-of-absence',
      'graduated',
      'withdrawn',
    ] as const) {
      expect(
        students.filter((s) => s.enrollmentStatus === status),
      ).not.toHaveLength(0)
    }
  })

  it('covers every program', () => {
    for (const program of loadLookups().programs) {
      expect(
        students.filter((s) => s.programId === program.id),
      ).not.toHaveLength(0)
    }
  })
})

describe('career map template', () => {
  const actions = loadCareerActions()
  const tracks = loadCareerTracks()
  const specializations = loadCareerSpecializations()
  const [general] = loadDataset().careerMaps
  const actionIds = new Set(actions.map((action) => action.id))

  it('defines every action exactly once', () => {
    expect(actionIds.size).toBe(actions.length)
  })

  it('places every general action in a term that exists', () => {
    for (const placement of general.placements) {
      expect(actionIds).toContain(placement.actionId)
      expect(CAREER_MAP_TERMS).toContain(placement.term)
    }
  })

  it('groups every action under a category that exists', () => {
    const categories = new Set(
      loadLookups().actionCategories.map((category) => category.id),
    )
    for (const action of actions) {
      expect(categories).toContain(action.categoryId)
    }
  })

  it('points every evidence rule at a lookup row that exists', () => {
    const lookups = loadLookups()
    const ids = {
      milestone: new Set(lookups.milestoneTypes.map((t) => t.id)),
      note: new Set(lookups.noteTypes.map((t) => t.id)),
      artifact: new Set(lookups.artifactTypes.map((t) => t.id)),
    }

    for (const action of actions) {
      if (!action.evidence) continue
      expect(ids[action.evidence.kind]).toContain(action.evidence.typeId)
    }
  })

  it('puts every specialization under a configured broad track', () => {
    const trackIds = new Set(tracks.map((track) => track.id))
    for (const specialization of specializations) {
      expect(trackIds).toContain(specialization.trackId)
    }
  })

  it('requires a specialization selection to include its parent track', () => {
    const result = studentCareerMapSchema.safeParse({
      trackId: null,
      trackSetAt: null,
      specializationId: 'specialization_backend_engineering',
      specializationSetAt: '2026-09-16T14:00:00.000Z',
      progress: [],
    })

    expect(result.success).toBe(false)
  })

  it('rejects a student whose specialization belongs to another track', () => {
    const dataset = structuredClone(loadDataset())
    const student = dataset.students.find(
      (item) => item.careerMap.specializationId !== null,
    )
    expect(student).toBeDefined()
    if (!student) return

    student.careerMap.trackId =
      student.careerMap.trackId === 'track_data_ai'
        ? 'track_software_engineering'
        : 'track_data_ai'

    expect(canonicalDatasetSchema.safeParse(dataset).success).toBe(false)
  })

  it('only lets a specialization add, move or exclude catalog actions', () => {
    const placedByGeneral = new Set(
      general.placements.map((placement) => placement.actionId),
    )

    for (const specialization of specializations) {
      for (const placement of specialization.placements) {
        expect(actionIds).toContain(placement.actionId)
      }
      // Excluding something the general map never placed is a typo, not an edit.
      for (const excluded of specialization.excludes) {
        expect(placedByGeneral).toContain(excluded)
      }
    }
  })

  it('gives every specialization the skills its path requires', () => {
    // A specialization with no required skills silently turns the skills gap
    // back into whatever an advisor typed once.
    for (const specialization of specializations) {
      expect(specialization.requiredSkills).not.toHaveLength(0)
      const ids = specialization.requiredSkills.map((skill) => skill.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('leaves no action stranded outside every map and specialization', () => {
    const placed = new Set(general.placements.map((p) => p.actionId))
    for (const specialization of specializations) {
      for (const placement of specialization.placements) {
        placed.add(placement.actionId)
      }
    }

    // An action in the catalog that nothing recommends is invisible in the UI
    // and impossible to notice by reading the file.
    expect([...actionIds].filter((id) => !placed.has(id))).toEqual([])
  })
})

describe('career map scenario coverage', () => {
  const students = loadStudents()
  const actionIds = new Set(loadCareerActions().map((action) => action.id))

  it('gives every student a well-formed entry term', () => {
    for (const student of students) {
      expect(student.entryTerm).toMatch(/^\d{4}(FA|SP|SU)$/)
    }
  })

  it('points every progress row at an action that exists', () => {
    for (const student of students) {
      for (const row of student.careerMap.progress) {
        expect(actionIds).toContain(row.actionId)
      }
    }
  })

  it('covers a student with nothing recorded on the map yet', () => {
    expect(
      students.filter((s) => s.careerMap.progress.length === 0),
    ).not.toHaveLength(0)
  })

  it('covers a student with no track chosen', () => {
    // The common case: everyone is on the general map until a path is picked.
    expect(
      students.filter((s) => s.careerMap.trackId === null),
    ).not.toHaveLength(0)
  })

  it('covers every track', () => {
    for (const track of loadCareerTracks()) {
      expect(
        students.filter((s) => s.careerMap?.trackId === track.id),
      ).not.toHaveLength(0)
    }
  })

  it('covers every specialization', () => {
    for (const specialization of loadCareerSpecializations()) {
      expect(
        students.filter(
          (student) => student.careerMap.specializationId === specialization.id,
        ),
      ).not.toHaveLength(0)
    }
  })

  it('covers a waived action, with a reason', () => {
    const waived = students.flatMap((s) =>
      s.careerMap.progress.filter((row) => row.status === 'not-applicable'),
    )
    expect(waived).not.toHaveLength(0)
    for (const row of waived) {
      expect(row.note).not.toBeNull()
    }
  })

  it('points every move at a reason that exists', () => {
    const reasons = new Set(loadLookups().moveReasons.map((r) => r.id))

    for (const student of students) {
      for (const row of student.careerMap.progress) {
        if (row.movedToTerm === null) continue
        expect(row.moveReasonId).not.toBeNull()
        expect(reasons).toContain(row.moveReasonId)
      }
    }
  })

  it('covers a student who arrived after their first year', () => {
    // The transfer case, which is what makes the "before they were here" path
    // render at all. Where a student starts on the map is derived from
    // `entryTerm`, so a fixture set where everybody entered as a freshman never
    // exercises it.
    const started = new Map(
      students.map((s) => [
        s.id,
        entryYearLevel(s.entryTerm, s.classification),
      ]),
    )
    expect([...started.values()].filter((level) => level > 1)).not.toHaveLength(
      0,
    )
  })

  it('covers an action an advisor carried into a later term, with a reason', () => {
    const moved = students.flatMap((s) =>
      s.careerMap.progress.filter((row) => row.movedToTerm !== null),
    )

    expect(moved).not.toHaveLength(0)
    for (const row of moved) {
      expect(row.note).not.toBeNull()
    }
  })

  it('covers a carry-forward for a reason other than transferring in', () => {
    // Moving an action is not a transfer-only tool — a student whose job ate a
    // semester gets the same treatment, and both paths need a fixture.
    const reasons = new Set(
      students.flatMap((s) =>
        s.careerMap.progress
          .filter((row) => row.movedToTerm !== null)
          .map((row) => row.moveReasonId),
      ),
    )
    expect(reasons.size).toBeGreaterThan(1)
  })

  it('covers work recorded under a specialization the student has since left', () => {
    // The previous-specialization section renders when a student has progress
    // for an action their current specialization does not include. Lose this fixture and
    // that whole path stops being exercised.
    const specializationPlacements = new Map(
      loadCareerSpecializations().map((specialization) => [
        specialization.id,
        new Set(
          specialization.placements.map((placement) => placement.actionId),
        ),
      ]),
    )
    const [general] = loadDataset().careerMaps
    const generalIds = new Set(general.placements.map((p) => p.actionId))

    const withStaleWork = students.filter((student) => {
      const map = student.careerMap
      if (!map.specializationId) return false
      const specialization =
        specializationPlacements.get(map.specializationId) ?? new Set()
      const excluded = new Set(
        loadCareerSpecializations().find(
          (item) => item.id === map.specializationId,
        )?.excludes ?? [],
      )
      return map.progress.some(
        (row) =>
          !specialization.has(row.actionId) &&
          (!generalIds.has(row.actionId) || excluded.has(row.actionId)),
      )
    })

    expect(withStaleWork).not.toHaveLength(0)
  })
})

/**
 * Which year level a student was in when they arrived, from their entry term
 * and where they are now. 1 for anyone who started here as a freshman.
 */
function entryYearLevel(entryTerm: string, classification: string): number {
  const YEARS: Record<string, number> = {
    freshman: 1,
    sophomore: 2,
    junior: 3,
    senior: 4,
  }
  const enrolledTerms = Math.max(
    0,
    enrollmentTermsBetween(entryTerm, academicTermForDate()),
  )
  return Math.max(1, YEARS[classification] - Math.floor(enrolledTerms / 2))
}
