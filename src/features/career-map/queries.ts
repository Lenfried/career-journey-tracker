// career-map — queries
//
// Service layer. The UI calls these; they call the data source.
//
// The derivations below are pure and exported so the awkward cases can be
// tested directly: a student who changed track, one on leave, one whose whole
// timeline is behind them, and a term full of actions nobody has touched.

import {
  CAREER_MAP_TERMS,
  type CareerAction,
  type CareerActionProgress,
  type CareerActionStatus,
  type CareerMap,
  type CareerMapTerm,
  type CareerTrack,
  type Classification,
  type EnrollmentStatus,
  type EvidenceKind,
  type LookupItem,
  type StudentCareerMap,
  type StudentRecord,
} from '@/lib/canonical'
import { formatCalendarDate, formatTimestamp, todayOnCampus } from '@/lib/dates'
import {
  loadCareerActions,
  loadCareerMap,
  loadCareerTrack,
  loadCareerTracks,
  loadLookups,
  loadStudent,
} from '@/lib/fixtures'
import {
  CAREER_ACTION_STATUS_LABELS,
  CAREER_MAP_TERM_LABELS,
} from '@/lib/labels'
import { indexLookup } from '@/lib/lookups'
import { academicTermForDate, formatAcademicTerm } from '@/lib/terms'
import type {
  CareerActionView,
  CareerMapPosition,
  CareerMapTermView,
  CareerMapView,
  CareerTrackOption,
  PreviousTrackActionView,
} from './types'

/**
 * A student's career map, or `null` when no advisor has assigned one.
 *
 * `null` is a real state, not an error: a student added last week is not on the
 * map until someone puts them on it, and the screen says so rather than showing
 * an empty four-year plan.
 */
export async function getCareerMap(
  studentId: string,
): Promise<CareerMapView | null> {
  const student = loadStudent(studentId)
  if (!student?.careerMap) return null

  const map = loadCareerMap(student.careerMap.mapId)
  // A dangling map id is a data problem, not a reason for the profile to 500.
  // The student reads as unassigned, which is visible and reportable.
  if (!map) return null

  const catalog = loadCareerActions()
  const lookups = loadLookups()

  return deriveCareerMapView({
    map,
    track: loadCareerTrack(student.careerMap.trackId) ?? null,
    tracks: loadCareerTracks(),
    catalog,
    assignment: student.careerMap,
    evidence: collectEvidence(student, catalog, lookups),
    categoryLabels: indexLookup(lookups.actionCategories),
    moveReasonLabels: indexLookup(lookups.moveReasons),
    position: deriveMapPosition(student, todayOnCampus()),
  })
}

/* -------------------------------------------------------------------------- */
/* Position                                                                    */
/* -------------------------------------------------------------------------- */

const YEAR_BY_CLASSIFICATION: Record<Classification, number> = {
  freshman: 1,
  sophomore: 2,
  junior: 3,
  senior: 4,
}

const TERM_SUFFIX: Record<string, string> = {
  FA: 'fall',
  SP: 'spring',
  SU: 'summer',
}

/** Past the last term — used when there is no current term to sit on. */
const PAST_TIMELINE = CAREER_MAP_TERMS.length

/**
 * Where a student is on the timeline today.
 *
 * Year comes from `classification` and season from the date. Deriving the year
 * from `entryTerm` instead would be more precise for a student who moves
 * through at exactly two terms a year and wrong for everyone else — and at a
 * commuter campus where many students are part-time, "everyone else" is a lot
 * of people. Classification is what the registrar maintains and what every
 * other screen already shows, so this can never contradict the roster.
 *
 * `today` is a parameter rather than a clock read so this can be tested against
 * a fixed date instead of drifting.
 */
export function deriveMapPosition(
  student: Pick<StudentRecord, 'classification' | 'enrollmentStatus'>,
  today: string,
): CareerMapPosition {
  const academicTerm = academicTermForDate(today)
  const season = academicTerm.slice(4)
  const year = YEAR_BY_CLASSIFICATION[student.classification]

  const candidate = `y${year}-${TERM_SUFFIX[season]}` as CareerMapTerm
  const index = CAREER_MAP_TERMS.indexOf(candidate)

  const state = mapState(student.enrollmentStatus)
  // There is no summer after senior year: that student has finished the map,
  // however their enrollment record reads.
  const onTimeline = index >= 0

  return {
    currentTerm: state === 'active' && onTimeline ? candidate : null,
    currentTermLabel:
      state === 'active' && onTimeline
        ? CAREER_MAP_TERM_LABELS[candidate]
        : null,
    state,
    academicTerm,
    academicTermLabel: formatAcademicTerm(academicTerm),
    timelineIndex: state === 'ended' || !onTimeline ? PAST_TIMELINE : index,
  }
}

function mapState(status: EnrollmentStatus): CareerMapPosition['state'] {
  if (status === 'enrolled') return 'active'
  // Nothing is overdue for someone who is not here. A student coming back from
  // leave to a wall of red is being told their leave was a failure.
  if (status === 'leave-of-absence') return 'paused'
  return 'ended'
}

/* -------------------------------------------------------------------------- */
/* Merge                                                                       */
/* -------------------------------------------------------------------------- */

export type MergedPlacement = {
  actionId: string
  term: CareerMapTerm
  /** The track put it here — either by adding it, or by moving it. */
  fromTrack: boolean
}

/**
 * The general map with a track layered over it.
 *
 * Three operations, in this order: the track's excludes drop base placements,
 * then its own placements either move an action the base map already places or
 * add one the base map does not. A track can never change what an action says —
 * that lives once in the catalog, so a wording fix reaches every track at the
 * same time, and so progress survives a student changing track.
 */
export function mergePlacements(
  map: CareerMap,
  track: CareerTrack | null,
): MergedPlacement[] {
  const merged = new Map<string, MergedPlacement>()

  for (const placement of map.placements) {
    merged.set(placement.actionId, { ...placement, fromTrack: false })
  }

  if (track) {
    for (const actionId of track.excludes) {
      merged.delete(actionId)
    }
    for (const placement of track.placements) {
      merged.set(placement.actionId, { ...placement, fromTrack: true })
    }
  }

  return [...merged.values()]
}

/* -------------------------------------------------------------------------- */
/* Evidence                                                                    */
/* -------------------------------------------------------------------------- */

export type EvidenceSummary = {
  kind: EvidenceKind
  count: number
  label: string
}

/**
 * What the rest of the record already says about each action.
 *
 * The app records most of what the map recommends — a career fair is a
 * milestone, a LinkedIn profile is a readiness artifact, an advising meeting is
 * a note. Counting those turns an unticked box into "1 career fair milestone on
 * file", which is the difference between an advisor guessing and an advisor
 * confirming.
 *
 * Deliberately unbounded in time: a milestone logged a term late still counts.
 * Scoping evidence to the term an action sits in would make the hint precise
 * and make late work invisible, which is the wrong trade for a hint.
 */
export function collectEvidence(
  student: Pick<StudentRecord, 'milestones' | 'notes' | 'artifacts'>,
  catalog: CareerAction[],
  lookups: {
    milestoneTypes: LookupItem[]
    noteTypes: LookupItem[]
    artifactTypes: LookupItem[]
  },
): Map<string, EvidenceSummary> {
  const milestoneLabels = indexLookup(lookups.milestoneTypes)
  const noteLabels = indexLookup(lookups.noteTypes)
  const artifactLabels = indexLookup(lookups.artifactTypes)

  const evidence = new Map<string, EvidenceSummary>()

  for (const action of catalog) {
    if (!action.evidence) continue
    const { kind, typeId } = action.evidence

    if (kind === 'milestone') {
      evidence.set(action.id, {
        kind,
        count: student.milestones.filter((m) => m.typeId === typeId).length,
        label: milestoneLabels.get(typeId) ?? typeId,
      })
      continue
    }

    if (kind === 'note') {
      evidence.set(action.id, {
        kind,
        count: student.notes.filter((n) => n.typeId === typeId).length,
        label: noteLabels.get(typeId) ?? typeId,
      })
      continue
    }

    const artifact = student.artifacts.find((a) => a.typeId === typeId)
    evidence.set(action.id, {
      kind,
      count: artifact?.status === 'complete' ? 1 : 0,
      label: artifactLabels.get(typeId) ?? typeId,
    })
  }

  return evidence
}

/* -------------------------------------------------------------------------- */
/* The view                                                                    */
/* -------------------------------------------------------------------------- */

export type CareerMapViewInput = {
  map: CareerMap
  track: CareerTrack | null
  tracks: CareerTrack[]
  catalog: CareerAction[]
  assignment: StudentCareerMap
  evidence: Map<string, EvidenceSummary>
  categoryLabels: Map<string, string>
  moveReasonLabels: Map<string, string>
  position: CareerMapPosition
}

/**
 * Pure. Everything the screen shows is computed here from the template, the
 * student's progress rows and today's position — nothing is read back from a
 * stored summary, because a stored completion count goes stale the first time
 * something writes through a path that forgets to update it.
 */
export function deriveCareerMapView({
  map,
  track,
  tracks,
  catalog,
  assignment,
  evidence,
  categoryLabels,
  moveReasonLabels,
  position,
}: CareerMapViewInput): CareerMapView {
  const actionsById = new Map(catalog.map((action) => [action.id, action]))
  const catalogOrder = new Map(
    catalog.map((action, index) => [action.id, index]),
  )
  const progressById = new Map(
    assignment.progress.map((row) => [row.actionId, row]),
  )

  const placements = mergePlacements(map, track)
  const startedIndex = CAREER_MAP_TERMS.indexOf(assignment.startedTerm)

  const views = placements
    .flatMap((placement) => {
      const action = actionsById.get(placement.actionId)
      // A placement pointing at an action that no longer exists is a data
      // problem. Dropping the row keeps the rest of the map readable.
      if (!action) return []

      return [
        toActionView({
          action,
          placement,
          progress: progressById.get(action.id),
          evidence: evidence.get(action.id),
          categoryLabel:
            categoryLabels.get(action.categoryId) ?? action.categoryId,
          moveReasonLabels,
          startedIndex,
          position,
        }),
      ]
    })
    .sort(
      (a, b) =>
        CAREER_MAP_TERMS.indexOf(a.term) - CAREER_MAP_TERMS.indexOf(b.term) ||
        // Something an advisor deliberately pulled into this term outranks
        // whatever the template happened to put there.
        Number(b.carriedOver) - Number(a.carriedOver) ||
        (catalogOrder.get(a.actionId) ?? 0) -
          (catalogOrder.get(b.actionId) ?? 0),
    )

  const terms: CareerMapTermView[] = CAREER_MAP_TERMS.map((term, index) => {
    const actions = views.filter((view) => view.term === term)

    return {
      term,
      termLabel: CAREER_MAP_TERM_LABELS[term],
      timing: termTiming(index, position),
      beforeStart: index < startedIndex,
      actions,
      doneCount: actions.filter((action) => action.status === 'done').length,
      applicableCount: actions.filter(isApplicable).length,
      overdueCount: actions.filter((action) => action.overdue).length,
    }
  })

  const applicable = views.filter(isApplicable)
  const done = applicable.filter((view) => view.status === 'done')

  const placed = new Set(placements.map((placement) => placement.actionId))

  return {
    mapId: map.id,
    mapLabel: map.label,
    mapVersion: assignment.mapVersion,
    lastReviewedLabel: formatCalendarDate(map.lastReviewed),
    startedTerm: assignment.startedTerm,
    startedTermLabel: CAREER_MAP_TERM_LABELS[assignment.startedTerm],
    trackId: track?.id ?? null,
    trackLabel: track?.label ?? null,
    trackDescription: track?.description ?? null,
    availableTracks: toTrackOptions(tracks, track),
    position,
    terms,
    doneCount: done.length,
    applicableCount: applicable.length,
    progressPercent:
      applicable.length === 0
        ? 0
        : Math.round((done.length / applicable.length) * 100),
    focusActions: position.currentTerm
      ? views.filter(
          (view) =>
            view.term === position.currentTerm &&
            view.status !== 'done' &&
            view.status !== 'not-applicable',
        )
      : [],
    overdueActions: views.filter((view) => view.overdue),
    carriedActions: views.filter((view) => view.carriedOver),
    previousTrackWork: toPreviousTrackWork(
      assignment.progress,
      placed,
      actionsById,
    ),
  }
}

function toActionView({
  action,
  placement,
  progress,
  evidence,
  categoryLabel,
  moveReasonLabels,
  startedIndex,
  position,
}: {
  action: CareerAction
  placement: MergedPlacement
  progress: CareerActionProgress | undefined
  evidence: EvidenceSummary | undefined
  categoryLabel: string
  moveReasonLabels: Map<string, string>
  startedIndex: number
  position: CareerMapPosition
}): CareerActionView {
  // Progress is sparse — only actions an advisor has touched have a row, and
  // everything else fills in at `not-started`, the same way the readiness
  // checklist fills in missing artifact rows.
  const status: CareerActionStatus = progress?.status ?? 'not-started'

  // An advisor's move beats the template. The template says when an action is
  // normally done; the advisor knows when this student is going to do it.
  const carriedOver = progress?.movedToTerm != null
  const term = progress?.movedToTerm ?? placement.term
  const termIndex = CAREER_MAP_TERMS.indexOf(term)

  // Only ever true for an action nobody has touched. A transfer who did the
  // Year 1 advising intake in their first term here did it — the template's
  // opinion about which year that belongs to does not take it away from them.
  const beforeStart = termIndex < startedIndex && status === 'not-started'

  return {
    actionId: action.id,
    title: action.title,
    why: action.why,
    categoryId: action.categoryId,
    categoryLabel,
    term,
    termLabel: CAREER_MAP_TERM_LABELS[term],
    templateTerm: placement.term,
    movedFromTerm: carriedOver ? placement.term : null,
    movedFromTermLabel: carriedOver
      ? CAREER_MAP_TERM_LABELS[placement.term]
      : null,
    moveReasonLabel:
      progress?.moveReasonId != null
        ? (moveReasonLabels.get(progress.moveReasonId) ?? progress.moveReasonId)
        : null,
    carriedOver,
    beforeStart,
    status,
    statusLabel: CAREER_ACTION_STATUS_LABELS[status],
    completedCount: progress?.completedCount ?? 0,
    targetCount: action.targetCount,
    resourceUrl: action.resourceUrl,
    fromTrack: placement.fromTrack,
    markedBy: progress?.markedBy ?? null,
    markedAtLabel: progress ? formatTimestamp(progress.markedAt) : null,
    note: progress?.note ?? null,
    evidenceCount: evidence?.count ?? 0,
    evidenceHint: describeEvidence(evidence, status),
    overdue:
      position.state === 'active' &&
      !beforeStart &&
      termIndex < position.timelineIndex &&
      status !== 'done' &&
      status !== 'not-applicable',
  }
}

/**
 * In the denominator.
 *
 * Waived actions leave it, and so do untouched actions from terms that ended
 * before the student joined the map. Either one left in would make a percentage
 * that says more about when a student arrived than about what they have done.
 */
function isApplicable(action: CareerActionView): boolean {
  return action.status !== 'not-applicable' && !action.beforeStart
}

/** `null` once the action is settled — a confirmed action needs no hint. */
function describeEvidence(
  evidence: EvidenceSummary | undefined,
  status: CareerActionStatus,
): string | null {
  if (!evidence || evidence.count === 0) return null
  if (status === 'done' || status === 'not-applicable') return null

  if (evidence.kind === 'artifact') {
    return `${evidence.label} is complete on the readiness checklist`
  }

  const noun = evidence.kind === 'milestone' ? 'milestone' : 'note'
  const label = evidence.label.toLowerCase()

  return evidence.count === 1
    ? `1 ${label} ${noun} on file`
    : `${evidence.count} ${label} ${noun}s on file`
}

function termTiming(
  index: number,
  position: CareerMapPosition,
): CareerMapTermView['timing'] {
  if (index < position.timelineIndex) return 'past'
  return index === position.timelineIndex ? 'current' : 'future'
}

function toTrackOptions(
  tracks: CareerTrack[],
  current: CareerTrack | null,
): CareerTrackOption[] {
  return tracks.map((track) => ({
    id: track.id,
    label: track.label,
    description: track.description,
    current: track.id === current?.id,
  }))
}

/**
 * Progress rows for actions the current track does not include.
 *
 * Almost always a track change. The rows are kept rather than deleted, so the
 * screen can say "you did this" instead of quietly losing a year of work the
 * first time a student decides research is not for them.
 */
function toPreviousTrackWork(
  progress: CareerActionProgress[],
  placed: Set<string>,
  actionsById: Map<string, CareerAction>,
): PreviousTrackActionView[] {
  return progress.flatMap((row) => {
    if (placed.has(row.actionId)) return []

    const action = actionsById.get(row.actionId)
    if (!action) return []

    return [
      {
        actionId: row.actionId,
        title: action.title,
        status: row.status,
        statusLabel: CAREER_ACTION_STATUS_LABELS[row.status],
        markedAtLabel: formatTimestamp(row.markedAt),
        note: row.note,
      },
    ]
  })
}
