import { describe, expect, it } from 'vitest'
import type { AdvisingNote } from '@/lib/canonical'
import { deriveFollowUpStatus, getStudentNotes } from './queries'

const TODAY = '2026-09-12'

function note(
  id: string,
  sessionDate: string,
  followUpDate: string | null,
): AdvisingNote {
  return {
    id,
    sessionDate,
    typeId: 'note_career',
    content: 'content',
    followUpDate,
    recordedBy: 'Advisor',
  }
}

describe('deriveFollowUpStatus', () => {
  it('reports overdue when the most recent note is past due', () => {
    const status = deriveFollowUpStatus(
      [note('a', '2026-07-30', '2026-08-20')],
      TODAY,
    )

    expect(status.overdue).toBe(true)
    expect(status.daysOverdue).toBe(23)
    expect(status.followUpDate).toBe('2026-08-20')
    expect(status.sessionDate).toBe('2026-07-30')
  })

  it('does not report overdue on the follow-up date itself', () => {
    // Due today is not yet overdue — the advisor still has the day.
    expect(
      deriveFollowUpStatus([note('a', '2026-09-01', TODAY)], TODAY).overdue,
    ).toBe(false)
  })

  it('ignores stale follow-ups on older notes', () => {
    // The whole rule: an old note with a past follow-up date is history. If
    // superseded notes counted, the dashboard alert list would fill with
    // entries nobody intends to act on, and an alert list nobody trusts is
    // worse than none.
    const status = deriveFollowUpStatus(
      [
        note('old', '2026-03-01', '2026-03-15'),
        note('recent', '2026-09-01', '2026-10-30'),
      ],
      TODAY,
    )

    expect(status.overdue).toBe(false)
    expect(status.followUpDate).toBe('2026-10-30')
  })

  it('is not overdue when the most recent note has no follow-up', () => {
    const status = deriveFollowUpStatus(
      [
        note('old', '2026-03-01', '2026-03-15'),
        note('recent', '2026-09-01', null),
      ],
      TODAY,
    )

    expect(status.overdue).toBe(false)
    expect(status.followUpDate).toBeNull()
  })

  it('handles a student with no notes', () => {
    const status = deriveFollowUpStatus([], TODAY)
    expect(status.overdue).toBe(false)
    expect(status.daysOverdue).toBe(0)
    expect(status.sessionDate).toBeNull()
  })

  it('breaks same-day ties deterministically', () => {
    const sameDay = [
      note('b', '2026-09-01', '2026-08-01'),
      note('a', '2026-09-01', '2026-12-01'),
    ]

    // Note `a` wins on the id tiebreak regardless of input order, so the answer
    // does not flip between renders.
    expect(deriveFollowUpStatus(sameDay, TODAY).followUpDate).toBe('2026-12-01')
    expect(
      deriveFollowUpStatus([...sameDay].reverse(), TODAY).followUpDate,
    ).toBe('2026-12-01')
  })
})

describe('getStudentNotes', () => {
  it('returns notes newest first', async () => {
    const notes = await getStudentNotes('stu_okonkwo_amara')
    const dates = notes.map((n) => n.sessionDate)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('resolves the note type lookup to a label', async () => {
    const notes = await getStudentNotes('stu_okonkwo_amara')
    expect(notes[0].typeLabel).toBe('Career')
  })

  it('returns an empty list for an unknown student', async () => {
    expect(await getStudentNotes('stu_does_not_exist')).toEqual([])
  })
})
