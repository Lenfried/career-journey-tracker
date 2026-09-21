import { describe, expect, it } from 'vitest'
import { getStudentSkills } from '@/features/skills/queries'
import { loadStudent, loadStudents } from '@/lib/fixtures'
import {
  assembleSummaryInput,
  buildStubSummary,
  deriveStaleness,
  fingerprintInput,
} from './queries'
import { advisorSummarySchema, summaryInputSchema } from './schemas'

/**
 * Tests import `lib/fixtures` directly to find out what the *record* holds, so
 * assertions can be written against the real values that must not appear in the
 * payload. That is the one legitimate reason to reach past the service layer —
 * the rule binds pages and components, and here the point is precisely to
 * compare the two sides of the boundary.
 */

/** Pinned so nothing here drifts with the clock. */
const TODAY = '2026-09-19'

const EMPTY_STUDENT = 'stu_lindqvist_tobias'
/** Has crisis and referral notes — the sensitive ones. */
const SENSITIVE_NOTES_STUDENT = 'stu_voznyak_oleksandr'
/** Everything filled in. */
const FULL_STUDENT = 'stu_okonkwo_amara'

async function input(studentId: string) {
  const assembled = await assembleSummaryInput(studentId, TODAY)
  if (!assembled) throw new Error(`fixture ${studentId} not found`)
  return assembled
}

describe('assembleSummaryInput', () => {
  it('returns null for an unknown student', async () => {
    expect(await assembleSummaryInput('stu_nobody', TODAY)).toBeNull()
  })

  it('produces a payload matching the input schema for every fixture student', async () => {
    for (const student of loadStudents()) {
      const assembled = await assembleSummaryInput(student.id, TODAY)
      expect(summaryInputSchema.safeParse(assembled).success).toBe(true)
    }
  })
})

describe('redaction', () => {
  /**
   * The load-bearing test of this feature.
   *
   * Serialises the payload for every fixture student and asserts that none of
   * the identifying values from their record appear anywhere in it — at any
   * depth, in any field, including ones added later. A test that checked named
   * keys would pass while a new field quietly carried a name through.
   */
  it('never sends anything that identifies the student', async () => {
    for (const student of loadStudents()) {
      const serialised = JSON.stringify(
        await assembleSummaryInput(student.id, TODAY),
      )

      const mustNotAppear = [
        student.id,
        student.emplid,
        student.firstName,
        student.lastName,
        student.email,
        ...(student.preferredName ? [student.preferredName] : []),
        ...(student.advisor ? [student.advisor] : []),
        ...(student.bio ? [student.bio] : []),
      ]

      for (const value of mustNotAppear) {
        expect(
          serialised,
          `${value} leaked into the payload for ${student.id}`,
        ).not.toContain(value)
      }
    }
  })

  it('never sends an artifact URL', async () => {
    // A portfolio or GitHub URL is very often the student's real name or
    // handle, which puts the identity back in through the one field nobody
    // thinks to check.
    for (const student of loadStudents()) {
      const serialised = JSON.stringify(
        await assembleSummaryInput(student.id, TODAY),
      )

      for (const artifact of student.artifacts) {
        if (artifact.url) expect(serialised).not.toContain(artifact.url)
      }
      expect(serialised).not.toContain('http')
    }
  })

  it('never sends who recorded a note or a milestone', async () => {
    for (const student of loadStudents()) {
      const serialised = JSON.stringify(
        await assembleSummaryInput(student.id, TODAY),
      )

      for (const recorder of [
        ...student.notes.map((note) => note.recordedBy),
        ...student.milestones.map((milestone) => milestone.recordedBy),
      ]) {
        expect(serialised).not.toContain(recorder)
      }
    }
  })

  it('never sends an absolute date', async () => {
    // Relative integers only, computed here, so the model has no date
    // arithmetic to get wrong.
    for (const student of loadStudents()) {
      const serialised = JSON.stringify(
        await assembleSummaryInput(student.id, TODAY),
      )
      expect(serialised).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    }
  })
})

describe('free-text fields reaching the model', () => {
  /**
   * These two assertions look like they are testing the obvious. They are
   * testing a coupling.
   *
   * `goal.advisorNotes` and `requiredSkills[].rationale` are free text with no
   * type, so the `aiEligible` filter cannot reach them. The compensating
   * control is a visible "Included in AI summaries" badge next to each field in
   * the UI. That badge is a claim about what this function does — and if
   * somebody later drops one of these fields from the payload, the badge
   * silently becomes a lie in the other direction, telling advisors their text
   * goes somewhere it does not.
   *
   * So: change the payload here and these fail, which is the prompt to go and
   * change the badge too. See AGENTS.md and docs/ai-summary.md.
   */
  it('sends goal.advisorNotes, which the UI badge promises', async () => {
    const assembled = await input(FULL_STUDENT)
    const record = loadStudent(FULL_STUDENT)

    expect(record?.goal?.advisorNotes).toBeTruthy()
    expect(assembled.goal?.advisorNotes).toBe(record?.goal?.advisorNotes)
  })

  it('sends requiredSkills[].rationale, which the UI badge promises', async () => {
    const assembled = await input(FULL_STUDENT)
    const withRationale = assembled.skills.required.filter(
      (skill) => skill.rationale !== null,
    )

    expect(withRationale.length).toBeGreaterThan(0)
  })

  it('sends no other free text from the student record', async () => {
    // Skill `evidence` frequently names an employer or a course section, so it
    // is left out. If that changes it needs a badge like the other two.
    const record = loadStudent(FULL_STUDENT)
    if (!record) throw new Error('fixture student missing')

    const serialised = JSON.stringify(await input(FULL_STUDENT))

    for (const skill of record.skills) {
      if (skill.evidence) expect(serialised).not.toContain(skill.evidence)
    }
  })
})

describe('sensitive advising notes', () => {
  it('excludes notes whose type is not aiEligible, and counts them', async () => {
    const record = loadStudent(SENSITIVE_NOTES_STUDENT)
    if (!record) throw new Error('fixture student missing')

    const sensitive = record.notes.filter(
      (note) =>
        note.typeId === 'note_crisis' || note.typeId === 'note_referral',
    )
    expect(sensitive.length).toBeGreaterThan(0)

    const assembled = await input(SENSITIVE_NOTES_STUDENT)
    const serialised = JSON.stringify(assembled)

    for (const note of sensitive) {
      expect(serialised).not.toContain(note.content)
    }

    expect(assembled.notes.withheldSensitiveCount).toBe(sensitive.length)
    expect(assembled.notes.items.every((note) => note.type !== 'Crisis')).toBe(
      true,
    )
    expect(
      assembled.notes.items.every((note) => note.type !== 'Referral'),
    ).toBe(true)
  })

  it('reports a withheld count of zero when every note is eligible', async () => {
    const assembled = await input(FULL_STUDENT)
    expect(assembled.notes.withheldSensitiveCount).toBe(0)
  })

  it('excludes every crisis and referral note across the whole fixture set', async () => {
    for (const student of loadStudents()) {
      const serialised = JSON.stringify(
        await assembleSummaryInput(student.id, TODAY),
      )

      for (const note of student.notes) {
        if (note.typeId === 'note_crisis' || note.typeId === 'note_referral') {
          expect(serialised).not.toContain(note.content)
        }
      }
    }
  })
})

describe('derived figures', () => {
  it('hands the model finished counts rather than things to count', async () => {
    const assembled = await input(FULL_STUDENT)
    const record = loadStudent(FULL_STUDENT)
    if (!record) throw new Error('fixture student missing')
    const skills = await getStudentSkills(FULL_STUDENT)

    expect(assembled.milestones.total).toBe(record.milestones.length)
    expect(assembled.skills.requiredCount).toBe(skills.requiredSkills.length)
    expect(assembled.skills.coveredCount + assembled.skills.gap.length).toBe(
      assembled.skills.requiredCount,
    )
    expect(assembled.readiness.total).toBe(assembled.readiness.artifacts.length)

    const counted = Object.values(assembled.milestones.countByType).reduce(
      (sum, count) => sum + count,
      0,
    )
    expect(counted).toBe(assembled.milestones.total)
  })

  it('fills in every artifact type even when the record omits rows', async () => {
    // `stu_kostopoulos_evander` carries one artifact row out of four.
    const assembled = await input('stu_kostopoulos_evander')
    expect(assembled.readiness.artifacts).toHaveLength(4)
  })

  it('truncates a very long note rather than sending all of it', async () => {
    const assembled = await input('stu_achebe_rosalind')

    for (const note of assembled.notes.items) {
      expect(note.content.length).toBeLessThanOrEqual(
        1_200 + '…[truncated]'.length,
      )
    }
  })
})

describe('the empty student', () => {
  it('reports an empty record rather than a thin one', async () => {
    const assembled = await input(EMPTY_STUDENT)

    expect(assembled.isEmptyRecord).toBe(true)
    expect(assembled.goal).toBeNull()
    expect(assembled.skills.held).toHaveLength(0)
    expect(assembled.skills.required).toHaveLength(0)
    expect(assembled.milestones.items).toHaveLength(0)
    expect(assembled.notes.items).toHaveLength(0)
    expect(assembled.notes.withheldSensitiveCount).toBe(0)
    expect(assembled.readiness.completeCount).toBe(0)
  })

  it('still describes the student’s program and standing', async () => {
    // The record is empty; the context is not. A first-semester freshman and a
    // graduating senior with nothing recorded need different advice.
    const assembled = await input(EMPTY_STUDENT)

    expect(assembled.context.program).not.toBe('')
    expect(assembled.context.classification).not.toBe('')
  })

  it('does not report an empty record for a student with only a goal', async () => {
    const assembled = await input('stu_mendoza_rios_lucia')
    expect(assembled.isEmptyRecord).toBe(false)
  })

  it('produces a stub summary that pads nothing', async () => {
    const summary = buildStubSummary(await input(EMPTY_STUDENT))

    expect(advisorSummarySchema.safeParse(summary).success).toBe(true)
    expect(summary.strengths).toHaveLength(0)
    expect(summary.gaps).toHaveLength(0)
    expect(summary.recommendations).toHaveLength(0)
    expect(summary.dataGaps.length).toBeGreaterThan(0)
  })
})

describe('the stub provider', () => {
  it('produces schema-valid output for every fixture student', async () => {
    for (const student of loadStudents()) {
      const assembled = await assembleSummaryInput(student.id, TODAY)
      if (!assembled) throw new Error('fixture student missing')

      expect(
        advisorSummarySchema.safeParse(buildStubSummary(assembled)).success,
      ).toBe(true)
    }
  })

  it('is obviously not a real summary', async () => {
    const summary = buildStubSummary(await input(FULL_STUDENT))
    expect(summary.headline).toContain('SAMPLE OUTPUT')
  })

  it('reports true counts, so the feature can be evaluated off campus', async () => {
    const assembled = await input(FULL_STUDENT)
    const summary = buildStubSummary(assembled)

    expect(summary.headline).toContain(
      `${assembled.milestones.total} milestone`,
    )
  })
})

describe('fingerprintInput', () => {
  it('is stable across repeated assembly of an unchanged record', async () => {
    const first = fingerprintInput(await input(FULL_STUDENT))
    const second = fingerprintInput(await input(FULL_STUDENT))
    expect(first).toBe(second)
  })

  it('does not move as the calendar does', async () => {
    // The critical property. `daysAgo` on a note increases every night; if it
    // were fingerprinted, every summary in the system would go stale each
    // morning and advisors would learn to ignore the banner.
    const today = fingerprintInput(await input(FULL_STUDENT))
    const muchLater = fingerprintInput(
      (await assembleSummaryInput(FULL_STUDENT, '2027-06-01'))!,
    )

    expect(muchLater).toBe(today)
  })

  it('differs between students', async () => {
    expect(fingerprintInput(await input(FULL_STUDENT))).not.toBe(
      fingerprintInput(await input(EMPTY_STUDENT)),
    )
  })

  it('moves when a milestone is added', async () => {
    const before = await input(FULL_STUDENT)
    const after = structuredClone(before)

    after.milestones.items.push({
      type: 'Internship',
      title: 'Summer analytics internship',
      description: null,
      monthsAgo: 2,
    })
    after.milestones.total += 1
    after.milestones.countByType.Internship =
      (after.milestones.countByType.Internship ?? 0) + 1

    expect(fingerprintInput(after)).not.toBe(fingerprintInput(before))
  })

  it('moves when a withheld sensitive note is added', async () => {
    // The content never enters the payload, but the count does — so logging a
    // crisis note does mark the summary stale without leaking anything.
    const before = await input(FULL_STUDENT)
    const after = structuredClone(before)
    after.notes.withheldSensitiveCount += 1

    expect(fingerprintInput(after)).not.toBe(fingerprintInput(before))
  })

  it('moves when a follow-up becomes overdue', async () => {
    const before = await input(FULL_STUDENT)
    const after = structuredClone(before)
    after.followUp.overdue = !after.followUp.overdue

    expect(fingerprintInput(after)).not.toBe(fingerprintInput(before))
  })

  it('does not move as an existing overdue follow-up ages', async () => {
    const before = await input(FULL_STUDENT)
    const after = structuredClone(before)
    after.followUp.daysOverdue += 30

    expect(fingerprintInput(after)).toBe(fingerprintInput(before))
  })
})

describe('deriveStaleness', () => {
  it('is fresh when the record and the prompt both match', () => {
    expect(deriveStaleness('abc', 'v1', 'abc', 'v1')).toEqual({ stale: false })
  })

  it('reports a changed record', () => {
    const result = deriveStaleness('abc', 'v1', 'xyz', 'v1')
    expect(result).toMatchObject({ stale: true, reason: 'record-changed' })
  })

  it('reports a changed prompt', () => {
    const result = deriveStaleness('abc', 'v1', 'abc', 'v2')
    expect(result).toMatchObject({ stale: true, reason: 'prompt-changed' })
  })

  it('reports the record when both changed', () => {
    // The data is the one that makes the advice potentially wrong.
    const result = deriveStaleness('abc', 'v1', 'xyz', 'v2')
    expect(result).toMatchObject({ stale: true, reason: 'record-changed' })
  })
})
