// career-map — types

import type { CareerActionStatus, CareerMapTerm } from '@/lib/canonical'

/**
 * Where a student sits on the timeline, and where they joined it.
 *
 * The map is the same eleven terms for everybody. What differs per student is
 * only when those terms happen: a freshman's Year 1 and a senior's Year 1 are
 * the same row on the same plan, three years apart on the calendar.
 *
 * Both ends are derived. The current term comes from `classification` and the
 * date — the registrar maintains classification, every screen already shows it,
 * and a map saying "Year 2" beside a roster row saying "Junior" loses an
 * advisor's trust in one glance. The start comes from `entryTerm`: a student who
 * arrived four enrollment terms ago joined the map four terms back from where
 * they are now, so a transfer's first two years are correctly not their own.
 */
export type CareerMapPosition = {
  /** `null` in the summer after senior year, and whenever the state is not active. */
  currentTerm: CareerMapTerm | null
  currentTermLabel: string | null
  /**
   * `active` — enrolled and in a term.
   * `paused` — on leave. Nothing is overdue for someone who is not here.
   * `ended` — graduated or withdrawn. The map is history, not a plan.
   */
  state: 'active' | 'paused' | 'ended'
  /** Where this student's own timeline starts. `y1-fall` for anyone who began here. */
  startedTerm: CareerMapTerm
  startedTermLabel: string
  startedIndex: number
  /** `2026FA`, and `Fall 2026`. */
  academicTerm: string
  academicTermLabel: string
  /**
   * Index into `CAREER_MAP_TERMS` that splits past from future. Set past the
   * end of the timeline when there is no current term — a graduated student, or
   * one in the summer after senior year — so nothing is left looking upcoming.
   */
  timelineIndex: number
}

/** One recommended action, resolved for one student. */
export type CareerActionView = {
  actionId: string
  title: string
  why: string
  categoryId: string
  categoryLabel: string
  /** Where this action sits for this student — the move wins over the template. */
  term: CareerMapTerm
  termLabel: string
  /** Where the template put it. Same as `term` unless an advisor moved it. */
  templateTerm: CareerMapTerm
  /** Set when an advisor moved this action, with the reason they gave. */
  movedFromTerm: CareerMapTerm | null
  movedFromTermLabel: string | null
  moveReasonLabel: string | null
  /**
   * Moved into this term from another one. Sorts first and reads as the
   * priority it is: somebody decided in a meeting that this is what comes next.
   */
  carriedOver: boolean
  /**
   * Sits in a term that ended before this student joined the map. Never overdue,
   * and out of the percentage entirely — a transfer who arrived in Year 3 was
   * not asked to do the Year 1 actions and must not be scored against them.
   */
  beforeStart: boolean
  status: CareerActionStatus
  statusLabel: string
  completedCount: number
  targetCount: number
  resourceUrl: string | null
  /** True when the student's track placed or moved this action. */
  fromTrack: boolean
  /** Who confirmed it, and when. `null` while nobody has touched the action. */
  markedBy: string | null
  markedAtLabel: string | null
  note: string | null
  /**
   * Corroboration from records the app already holds — a career fair milestone
   * for "go to the career fair", a complete artifact for "create a LinkedIn".
   *
   * A hint, never a tick. The advisor confirms; the app never marks an action
   * done on its own, because the only thing worse than an advisor ticking a box
   * is the app ticking it for them and being wrong.
   */
  evidenceCount: number
  evidenceHint: string | null
  /** In a term that has passed, and not done or waived. */
  overdue: boolean
}

/** One term of the timeline. */
export type CareerMapTermView = {
  term: CareerMapTerm
  termLabel: string
  timing: 'past' | 'current' | 'future'
  /** Ended before the student joined the map. History, not homework. */
  beforeStart: boolean
  actions: CareerActionView[]
  doneCount: number
  /** Total minus the waived ones. The denominator for this term. */
  applicableCount: number
  overdueCount: number
}

/**
 * Work recorded against an action the student's current track does not include
 * — almost always because they changed track.
 *
 * Kept rather than deleted. A sophomore who spent a year on research before
 * moving to industry did that work, and erasing it on switch punishes exactly
 * the exploration this tool exists to encourage.
 */
export type PreviousTrackActionView = {
  actionId: string
  title: string
  status: CareerActionStatus
  statusLabel: string
  markedAtLabel: string
  note: string | null
}

/** A track a student could be moved to. */
export type CareerTrackOption = {
  id: string
  label: string
  description: string
  /** True for the track the student is on. */
  current: boolean
}

/**
 * Everything the career map screen renders.
 *
 * Flat and fully label-resolved on purpose: nothing downstream has to re-join a
 * lookup table, and the whole structure is safe to serialise — there is no name,
 * email or EMPLID anywhere in it, only ids and labels. That matters for the
 * summarisation work: this is the shape you would hand a model, unchanged.
 */
export type CareerMapView = {
  mapId: string
  mapLabel: string
  mapVersion: number
  /** Half this advice has a month in it. This is when a human last checked. */
  lastReviewedLabel: string
  trackId: string | null
  trackLabel: string | null
  trackDescription: string | null
  availableTracks: CareerTrackOption[]
  position: CareerMapPosition
  terms: CareerMapTermView[]
  doneCount: number
  applicableCount: number
  /**
   * 0–100 over applicable actions only. Waived actions leave both the numerator
   * and the denominator: a transfer student with four terms marked
   * not-applicable must not read as permanently behind.
   */
  progressPercent: number
  /** The current term's unfinished actions — what to raise in today's meeting. */
  focusActions: CareerActionView[]
  /** Everything overdue, most overdue term first. */
  overdueActions: CareerActionView[]
  /** Everything an advisor has moved, wherever it landed. */
  carriedActions: CareerActionView[]
  previousTrackWork: PreviousTrackActionView[]
}

/**
 * One student's career map, reduced to the numbers a list can show.
 *
 * The profile tab needs every action; a roster row or a dashboard panel needs
 * six integers. Same derivation behind both — a second, lighter calculation
 * would be a second answer to the same question, and the two would disagree
 * within a month.
 */
export type CareerMapStatus = {
  /** `none` when there is no map to show — an unknown student, or no map published. */
  state: CareerMapPosition['state'] | 'none'
  trackLabel: string | null
  currentTermLabel: string | null
  doneCount: number
  applicableCount: number
  progressPercent: number
  overdueCount: number
  /** Unfinished actions in the current term — what today's meeting is about. */
  focusCount: number
}
