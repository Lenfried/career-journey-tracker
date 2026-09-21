'use server'

// career-map — actions
//
// Writes for the department's template: the action catalog, the general map,
// and the specializations layered over it. Every function here is thin — parse the
// FormData with a schema from `./schemas.ts`, hand the parsed input to a pure
// function in `./admin.ts`, persist the result, redirect back.
//
// Per-student writes — markCareerAction(), setCareerPath(),
// assignCareerMap() — are a separate, later piece of work: a student's own
// progress and taxonomy choice, not the shared template these edit.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { authedAction } from '@/lib/authz'
import type { CareerMapTerm } from '@/lib/canonical'
import { loadDataset, saveDataset } from '@/lib/fixtures'
import {
  addRequiredSkill,
  applyMapPlacements,
  applySpecializationActionOverride,
  createCareerAction,
  createCareerSpecialization,
  deleteCareerAction,
  deleteCareerSpecialization,
  describeActionUsage,
  describeSpecializationUsage,
  removeRequiredSkill,
  replaceSpecialization,
  updateCareerAction,
  updateCareerSpecializationDetails,
} from './admin'
import {
  careerActionFormSchema,
  careerSpecializationFormSchema,
  mapAssignmentValueSchema,
  requiredSkillFormSchema,
  specializationActionOverrideFormSchema,
} from './schemas'

const CATALOG_PATH = '/admin/career-map/catalog'
const GENERAL_PATH = '/admin/career-map/general'
const TRACKS_PATH = '/admin/career-map/tracks'
const ROLES = ['faculty-advisor', 'career-advisor', 'admin'] as const
const specializationPath = (id: string) =>
  `/admin/career-map/specializations/${id}`

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

async function createCareerActionActionImpl(formData: FormData) {
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

async function updateCareerActionActionImpl(
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

async function deleteCareerActionActionImpl(actionId: string) {
  const dataset = loadDataset()
  const [map] = dataset.careerMaps
  if (!map) fail(CATALOG_PATH, 'No career map is published.')

  const usage = describeActionUsage(
    actionId,
    map,
    dataset.careerSpecializations,
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
async function updateGeneralMapActionImpl(formData: FormData) {
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
/* Specializations                                                             */
/* -------------------------------------------------------------------------- */

async function createCareerSpecializationActionImpl(formData: FormData) {
  const parsed = careerSpecializationFormSchema.safeParse(
    Object.fromEntries(formData),
  )
  if (!parsed.success) fail(TRACKS_PATH, firstIssue(parsed.error))

  const dataset = loadDataset()
  if (!dataset.careerTracks.some((track) => track.id === parsed.data.trackId)) {
    fail(TRACKS_PATH, 'That track no longer exists.')
  }
  saveDataset({
    ...dataset,
    careerSpecializations: createCareerSpecialization(
      dataset.careerSpecializations,
      parsed.data,
    ),
  })
  revalidatePath(TRACKS_PATH)
  redirect(TRACKS_PATH)
}

async function updateCareerSpecializationDetailsActionImpl(
  specializationId: string,
  formData: FormData,
) {
  const parsed = careerSpecializationFormSchema.safeParse(
    Object.fromEntries(formData),
  )
  if (!parsed.success) {
    fail(specializationPath(specializationId), firstIssue(parsed.error))
  }

  const dataset = loadDataset()
  if (!dataset.careerTracks.some((track) => track.id === parsed.data.trackId)) {
    fail(specializationPath(specializationId), 'That track no longer exists.')
  }
  const existing = dataset.careerSpecializations.find(
    (item) => item.id === specializationId,
  )
  if (!existing) {
    fail(TRACKS_PATH, 'That specialization no longer exists.')
  }
  if (
    existing.trackId !== parsed.data.trackId &&
    describeSpecializationUsage(specializationId, dataset.students)
  ) {
    fail(
      specializationPath(specializationId),
      'Move the assigned students before changing this specialization’s track.',
    )
  }
  saveDataset({
    ...dataset,
    careerSpecializations: updateCareerSpecializationDetails(
      dataset.careerSpecializations,
      specializationId,
      parsed.data,
    ),
  })
  revalidatePath(specializationPath(specializationId))
  revalidatePath(TRACKS_PATH)
  redirect(specializationPath(specializationId))
}

async function deleteCareerSpecializationActionImpl(
  specializationId: string,
) {
  const dataset = loadDataset()
  const usage = describeSpecializationUsage(specializationId, dataset.students)
  if (usage) {
    fail(TRACKS_PATH, `Can't delete this specialization — ${usage}.`)
  }

  saveDataset({
    ...dataset,
    careerSpecializations: deleteCareerSpecialization(
      dataset.careerSpecializations,
      specializationId,
    ),
  })
  revalidatePath(TRACKS_PATH)
  redirect(TRACKS_PATH)
}

/** Saves one overlay card so the board never needs to render the whole catalog. */
async function setSpecializationActionOverrideActionImpl(
  specializationId: string,
  formData: FormData,
) {
  const parsed = specializationActionOverrideFormSchema.safeParse(
    Object.fromEntries(formData),
  )
  if (!parsed.success) {
    fail(specializationPath(specializationId), firstIssue(parsed.error))
  }

  const dataset = loadDataset()
  const specialization = dataset.careerSpecializations.find(
    (item) => item.id === specializationId,
  )
  if (!specialization) {
    fail(TRACKS_PATH, 'That specialization no longer exists.')
  }
  if (
    !dataset.careerActions.some((action) => action.id === parsed.data.actionId)
  ) {
    fail(specializationPath(specializationId), 'That action no longer exists.')
  }

  const [generalMap] = dataset.careerMaps
  const onGeneralMap = generalMap?.placements.some(
    (placement) => placement.actionId === parsed.data.actionId,
  )
  if (parsed.data.override === 'excluded' && !onGeneralMap) {
    fail(
      specializationPath(specializationId),
      'Only an action inherited from the general map can be excluded.',
    )
  }

  const updated = applySpecializationActionOverride(
    specialization,
    parsed.data.actionId,
    parsed.data.override,
  )
  saveDataset({
    ...dataset,
    careerSpecializations: replaceSpecialization(
      dataset.careerSpecializations,
      updated,
    ),
  })
  revalidatePath(specializationPath(specializationId))
  redirect(specializationPath(specializationId))
}

/* -------------------------------------------------------------------------- */
/* Required skills, per specialization                                         */
/* -------------------------------------------------------------------------- */

async function addRequiredSkillActionImpl(
  specializationId: string,
  formData: FormData,
) {
  const parsed = requiredSkillFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    fail(specializationPath(specializationId), firstIssue(parsed.error))
  }

  const dataset = loadDataset()
  const specialization = dataset.careerSpecializations.find(
    (item) => item.id === specializationId,
  )
  if (!specialization) {
    fail(TRACKS_PATH, 'That specialization no longer exists.')
  }

  const updated = addRequiredSkill(specialization, parsed.data)
  saveDataset({
    ...dataset,
    careerSpecializations: replaceSpecialization(
      dataset.careerSpecializations,
      updated,
    ),
  })
  revalidatePath(specializationPath(specializationId))
  redirect(specializationPath(specializationId))
}

async function removeRequiredSkillActionImpl(
  specializationId: string,
  skillId: string,
) {
  const dataset = loadDataset()
  const specialization = dataset.careerSpecializations.find(
    (item) => item.id === specializationId,
  )
  if (!specialization) {
    fail(TRACKS_PATH, 'That specialization no longer exists.')
  }

  const updated = removeRequiredSkill(specialization, skillId)
  saveDataset({
    ...dataset,
    careerSpecializations: replaceSpecialization(
      dataset.careerSpecializations,
      updated,
    ),
  })
  revalidatePath(specializationPath(specializationId))
  redirect(specializationPath(specializationId))
}

function adminAction<Args extends unknown[], Result>(
  handler: (...args: Args) => Promise<Result>,
) {
  return authedAction(ROLES, (_actor, ...args: Args) => handler(...args))
}

export const createCareerActionAction = adminAction(
  createCareerActionActionImpl,
)
export const updateCareerActionAction = adminAction(
  updateCareerActionActionImpl,
)
export const deleteCareerActionAction = adminAction(
  deleteCareerActionActionImpl,
)
export const updateGeneralMapAction = adminAction(updateGeneralMapActionImpl)
export const createCareerSpecializationAction = adminAction(
  createCareerSpecializationActionImpl,
)
export const updateCareerSpecializationDetailsAction = adminAction(
  updateCareerSpecializationDetailsActionImpl,
)
export const deleteCareerSpecializationAction = adminAction(
  deleteCareerSpecializationActionImpl,
)
export const setSpecializationActionOverrideAction = adminAction(
  setSpecializationActionOverrideActionImpl,
)
export const addRequiredSkillAction = adminAction(addRequiredSkillActionImpl)
export const removeRequiredSkillAction = adminAction(
  removeRequiredSkillActionImpl,
)
