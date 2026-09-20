import { describe, expect, it } from 'vitest'
import { ARTIFACT_STATUSES, noteTypeLookupSchema } from './canonical'
import { loadDataset, loadLookups, loadStudents } from './fixtures'

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

  it('keeps the sensitive note types out of AI processing', () => {
    // `aiEligible` is what stops a crisis note reaching a language model. It is
    // data rather than code so it can change without a deploy, which also means
    // it can change by accident — this is the assertion that makes that loud.
    const noteTypes = new Map(
      loadLookups().noteTypes.map((type) => [type.id, type.aiEligible]),
    )

    expect(noteTypes.get('note_crisis')).toBe(false)
    expect(noteTypes.get('note_referral')).toBe(false)
    expect(noteTypes.get('note_career')).toBe(true)
  })

  it('defaults a note type with no aiEligible flag to ineligible', () => {
    // Fails closed. A note type added by someone who has not read
    // docs/ai-summary.md is excluded from model calls until somebody makes the
    // inclusion deliberate.
    const parsed = noteTypeLookupSchema.parse({
      id: 'note_accommodations',
      label: 'Accommodations',
    })

    expect(parsed.aiEligible).toBe(false)
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
