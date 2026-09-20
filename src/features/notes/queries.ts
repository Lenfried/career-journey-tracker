// notes — queries

import type { AdvisingNote } from '@/lib/canonical'
import {
  daysBetween,
  describeFollowUp,
  formatCalendarDate,
  todayOnCampus,
} from '@/lib/dates'
import { loadLookups, loadStudent, loadStudents } from '@/lib/fixtures'
import { indexLookup } from '@/lib/lookups'
import type { AdvisingNoteView, FollowUpStatus } from './types'

/** A student's notes, most recent session first. */
export async function getStudentNotes(
  studentId: string,
): Promise<AdvisingNoteView[]> {
  const student = loadStudent(studentId)
  if (!student) return []

  const today = todayOnCampus()
  const typeLabels = indexLookup(loadLookups().noteTypes)

  return sortByRecency(student.notes).map((note) => ({
    id: note.id,
    sessionDate: note.sessionDate,
    sessionDateLabel: formatCalendarDate(note.sessionDate),
    typeId: note.typeId,
    typeLabel: typeLabels.get(note.typeId) ?? note.typeId,
    content: note.content,
    followUpDate: note.followUpDate,
    followUpLabel: note.followUpDate
      ? describeFollowUp(note.followUpDate, today)
      : null,
    followUpOverdue: note.followUpDate ? note.followUpDate < today : false,
    recordedBy: note.recordedBy,
  }))
}

/** Whether one student is overdue for follow-up. */
export async function getFollowUpStatus(
  studentId: string,
): Promise<FollowUpStatus> {
  const student = loadStudent(studentId)
  if (!student) return NO_FOLLOW_UP
  return deriveFollowUpStatus(student.notes, todayOnCampus())
}

/**
 * Follow-up status for every student, keyed by student id.
 *
 * The dashboard needs this for the whole roster at once. Returning the map in
 * one pass keeps `lib/fixtures` behind the service layer — the alternative,
 * letting the dashboard iterate students itself and call `getFollowUpStatus()`
 * per student, would have it importing the data source directly.
 */
export async function listFollowUpStatuses(): Promise<
  Map<string, FollowUpStatus>
> {
  const today = todayOnCampus()

  return new Map(
    loadStudents().map((student) => [
      student.id,
      deriveFollowUpStatus(student.notes, today),
    ]),
  )
}

/**
 * The note type ids whose notes may be included in a payload sent to a model.
 *
 * Lives here rather than in the summary feature because the flag is a property
 * of the note type lookup, and the lookup is this feature's data. The summary
 * feature asks; it does not read `lib/fixtures` and it does not keep its own
 * list of ids.
 *
 * Fails closed: a note type with no `aiEligible` flag is absent from this set.
 * See `docs/ai-summary.md`.
 */
export async function listAiEligibleNoteTypeIds(): Promise<Set<string>> {
  return new Set(
    loadLookups()
      .noteTypes.filter((type) => type.aiEligible)
      .map((type) => type.id),
  )
}

/* -------------------------------------------------------------------------- */
/* Derivation                                                                  */
/* -------------------------------------------------------------------------- */

const NO_FOLLOW_UP: FollowUpStatus = {
  overdue: false,
  followUpDate: null,
  daysOverdue: 0,
  sessionDate: null,
}

/**
 * Pure, and takes `today` rather than reading the clock, so the rule can be
 * tested against a fixed date instead of drifting into a green-today,
 * red-tomorrow test.
 *
 * Only the most recent note counts — see `FollowUpStatus` for why.
 */
export function deriveFollowUpStatus(
  notes: AdvisingNote[],
  today: string,
): FollowUpStatus {
  const [latest] = sortByRecency(notes)
  if (!latest?.followUpDate) return NO_FOLLOW_UP

  // ISO calendar dates sort lexicographically, so `<` is a correct date
  // comparison and sidesteps timezone handling entirely.
  const overdue = latest.followUpDate < today

  return {
    overdue,
    followUpDate: latest.followUpDate,
    daysOverdue: overdue
      ? Math.abs(daysBetween(today, latest.followUpDate))
      : 0,
    sessionDate: latest.sessionDate,
  }
}

/**
 * Most recent session first. Ties break on id so the order is stable — two
 * notes recorded on the same day must not swap places between renders.
 */
function sortByRecency(notes: AdvisingNote[]): AdvisingNote[] {
  return notes
    .slice()
    .sort(
      (a, b) =>
        b.sessionDate.localeCompare(a.sessionDate) || a.id.localeCompare(b.id),
    )
}
