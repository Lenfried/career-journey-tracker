'use server'

// career-map — actions
//
// Writes for the department's template: the action catalog, the general map,
// and the tracks layered over it. Every function here is thin — parse the
// FormData with a schema from `./schemas.ts`, hand the parsed input to a pure
// function in `./admin.ts`, persist the result, redirect back.
//
// UNGUARDED, ON PURPOSE. Rule 1 in AGENTS.md requires every mutation to be
// wrapped in `authedAction()`, and that does not exist yet — auth is Phase 2.
// This is a discussed exception, not an oversight (see the note at the top of
// `./admin.ts`): the app cannot be deployed anywhere real student data could
// reach it regardless, and nothing here writes a student record. Wrap these
// in `authedAction()` the day auth lands, before this app goes anywhere near
// production data.
//
// Per-student writes — markCareerAction(), setCareerTrack(),
// assignCareerMap() — are a separate, later piece of work: a student's own
// progress and track choice, not the shared template these edit.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { CareerMapTerm } from '@/lib/canonical'
import { loadDataset, saveDataset } from '@/lib/fixtures'
import {
  addRequiredSkill,
  applyMapPlacements,
  applyTrackOverlay,
  createCareerAction,
  createCareerTrack,
  deleteCareerAction,
  deleteCareerTrack,
  describeActionUsage,
  describeTrackUsage,
  removeRequiredSkill,
  replaceTrack,
  updateCareerAction,
  updateCareerTrackDetails,
  type TrackOverride,
} from './admin'
import {
  careerActionFormSchema,
  careerTrackFormSchema,
  mapAssignmentValueSchema,
  requiredSkillFormSchema,
  trackOverrideValueSchema,
} from './schemas'

const CATALOG_PATH = '/admin/career-map/catalog'
const GENERAL_PATH = '/admin/career-map/general'
const TRACKS_PATH = '/admin/career-map/tracks'
const trackPath = (id: string) => `/admin/career-map/tracks/${id}`

/** Sends the admin back to `path` with a message the page reads from `?error=`. */
function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`)
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? 'That input was not valid.'
}

/* -------------------------------------------------------------------------- */
/* The action catalog                                                          */
/* -------------------------------------------------------------------------- */

export async function createCareerActionAction(formData: FormData) {
  const parsed = careerActionFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) fail(CATALOG_PATH, firstIssue(parsed.error))

  const dataset = loadDataset()
  saveDataset({
    ...dataset,
    careerActions: createCareerAction(dataset.careerActions, parsed.data),
  })
  revalidatePath(CATALOG_PATH)
  redirect(CATALOG_PATH)
}

export async function updateCareerActionAction(
  actionId: string,
  formData: FormData,
) {
  const parsed = careerActionFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) fail(CATALOG_PATH, firstIssue(parsed.error))

  const dataset = loadDataset()
  saveDataset({
    ...dataset,
    careerActions: updateCareerAction(
      dataset.careerActions,
      actionId,
      parsed.data,
    ),
  })
  revalidatePath(CATALOG_PATH)
  redirect(CATALOG_PATH)
}

export async function deleteCareerActionAction(actionId: string) {
  const dataset = loadDataset()
  const [map] = dataset.careerMaps
  if (!map) fail(CATALOG_PATH, 'No career map is published.')

  const usage = describeActionUsage(
    actionId,
    map,
    dataset.careerTracks,
    dataset.students,
  )
  if (usage) fail(CATALOG_PATH, `Can't delete this action — it is ${usage}.`)

  saveDataset({
    ...dataset,
    careerActions: deleteCareerAction(dataset.careerActions, actionId),
  })
  revalidatePath(CATALOG_PATH)
  redirect(CATALOG_PATH)
}

/* -------------------------------------------------------------------------- */
/* The general map                                                             */
/* -------------------------------------------------------------------------- */

/**
 * One save for the whole general-map table: a term picker per catalog action,
 * submitted together, because that is how the form presents it — one page,
 * one save button, not fifty-four round trips.
 */
export async function updateGeneralMapAction(formData: FormData) {
  const dataset = loadDataset()
  const [map] = dataset.careerMaps
  if (!map) fail(GENERAL_PATH, 'No career map is published.')

  const assignments = new Map<string, CareerMapTerm | null>()
  for (const action of dataset.careerActions) {
    const parsed = mapAssignmentValueSchema.safeParse(
      formData.get(`term-${action.id}`),
    )
    if (!parsed.success) {
      fail(GENERAL_PATH, `"${action.title}" has an invalid term.`)
    }
    assignments.set(action.id, parsed.data === '' ? null : parsed.data)
  }

  const updatedMap = applyMapPlacements(map, assignments)
  saveDataset({
    ...dataset,
    careerMaps: dataset.careerMaps.map((m) =>
      m.id === updatedMap.id ? updatedMap : m,
    ),
  })
  revalidatePath(GENERAL_PATH)
  redirect(GENERAL_PATH)
}

/* -------------------------------------------------------------------------- */
/* Tracks                                                                      */
/* -------------------------------------------------------------------------- */

export async function createCareerTrackAction(formData: FormData) {
  const parsed = careerTrackFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) fail(TRACKS_PATH, firstIssue(parsed.error))

  const dataset = loadDataset()
  saveDataset({
    ...dataset,
    careerTracks: createCareerTrack(dataset.careerTracks, parsed.data),
  })
  revalidatePath(TRACKS_PATH)
  redirect(TRACKS_PATH)
}

export async function updateCareerTrackDetailsAction(
  trackId: string,
  formData: FormData,
) {
  const parsed = careerTrackFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) fail(trackPath(trackId), firstIssue(parsed.error))

  const dataset = loadDataset()
  saveDataset({
    ...dataset,
    careerTracks: updateCareerTrackDetails(
      dataset.careerTracks,
      trackId,
      parsed.data,
    ),
  })
  revalidatePath(trackPath(trackId))
  revalidatePath(TRACKS_PATH)
  redirect(trackPath(trackId))
}

export async function deleteCareerTrackAction(trackId: string) {
  const dataset = loadDataset()
  const usage = describeTrackUsage(trackId, dataset.students)
  if (usage) fail(TRACKS_PATH, `Can't delete this track — ${usage}.`)

  saveDataset({
    ...dataset,
    careerTracks: deleteCareerTrack(dataset.careerTracks, trackId),
  })
  revalidatePath(TRACKS_PATH)
  redirect(TRACKS_PATH)
}

/** One save for a track's whole overlay table — same shape as the general map. */
export async function updateTrackOverlayAction(
  trackId: string,
  formData: FormData,
) {
  const dataset = loadDataset()
  const track = dataset.careerTracks.find((t) => t.id === trackId)
  if (!track) fail(TRACKS_PATH, 'That track no longer exists.')

  const overrides = new Map<string, TrackOverride>()
  for (const action of dataset.careerActions) {
    const parsed = trackOverrideValueSchema.safeParse(
      formData.get(`override-${action.id}`),
    )
    if (!parsed.success) {
      fail(trackPath(trackId), `"${action.title}" has an invalid choice.`)
    }
    overrides.set(action.id, parsed.data)
  }

  const updated = applyTrackOverlay(track, overrides)
  saveDataset({
    ...dataset,
    careerTracks: replaceTrack(dataset.careerTracks, updated),
  })
  revalidatePath(trackPath(trackId))
  redirect(trackPath(trackId))
}

/* -------------------------------------------------------------------------- */
/* Required skills, per track                                                  */
/* -------------------------------------------------------------------------- */

export async function addRequiredSkillAction(
  trackId: string,
  formData: FormData,
) {
  const parsed = requiredSkillFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) fail(trackPath(trackId), firstIssue(parsed.error))

  const dataset = loadDataset()
  const track = dataset.careerTracks.find((t) => t.id === trackId)
  if (!track) fail(TRACKS_PATH, 'That track no longer exists.')

  const updated = addRequiredSkill(track, parsed.data)
  saveDataset({
    ...dataset,
    careerTracks: replaceTrack(dataset.careerTracks, updated),
  })
  revalidatePath(trackPath(trackId))
  redirect(trackPath(trackId))
}

export async function removeRequiredSkillAction(
  trackId: string,
  skillId: string,
) {
  const dataset = loadDataset()
  const track = dataset.careerTracks.find((t) => t.id === trackId)
  if (!track) fail(TRACKS_PATH, 'That track no longer exists.')

  const updated = removeRequiredSkill(track, skillId)
  saveDataset({
    ...dataset,
    careerTracks: replaceTrack(dataset.careerTracks, updated),
  })
  revalidatePath(trackPath(trackId))
  redirect(trackPath(trackId))
}
