// notes — types

/** One advising note, ready to render. */
export type AdvisingNoteView = {
  id: string
  sessionDate: string
  sessionDateLabel: string
  typeId: string
  typeLabel: string
  content: string
  followUpDate: string | null
  /** "3 days overdue", "due today", "due in 5 days". `null` with no follow-up. */
  followUpLabel: string | null
  followUpOverdue: boolean
  recordedBy: string
}

/**
 * Whether a student is waiting on their advisor.
 *
 * Derived from the *most recent* note only. An old note with a stale follow-up
 * date is history, not a task — surfacing those would fill the dashboard alert
 * list with things nobody intends to act on, and an alert list nobody trusts is
 * worse than no alert list.
 */
export type FollowUpStatus = {
  overdue: boolean
  /** The follow-up date on the most recent note, when it has one. */
  followUpDate: string | null
  /** Days past due. `0` when not overdue. */
  daysOverdue: number
  /** Date of the note the follow-up came from. */
  sessionDate: string | null
}
