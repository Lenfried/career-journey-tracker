// career-map — admin
//
// Pure mutation logic for the department's template: the action catalog, the
// general map, and the specializations layered over it. No filesystem access
// here — `actions.ts` is the thin Server Action wrapper that reads the current
// dataset through `lib/fixtures`, calls into this file, and writes the result
// back with `saveDataset()`. Keeping the actual edits here, taking a slice of
// the dataset and returning a new one, is what makes them testable without
// touching disk.
//
// EDITING HERE IS UNGUARDED. Rule 1 in AGENTS.md requires every Server Action
// to be wrapped in `authedAction()`, and there is no such thing yet — auth is
// Phase 2. This is a deliberate, discussed exception, not an oversight: the
// app already cannot be deployed anywhere a real student record could reach
// it (see AGENTS.md), and this module writes only to the shared template
// (catalog/map/specializations), never to a student record. It still needs wrapping
// the moment auth exists.

import type {
  CareerAction,
  CareerActionPlacement,
  CareerMap,
  CareerMapTerm,
  CareerSpecialization,
  Importance,
  RequiredSkill,
  SkillCategory,
  StudentRecord,
} from '@/lib/canonical'

/* -------------------------------------------------------------------------- */
/* Ids                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * A stable id from a human label: `slugify('act_', 'Meet your advisor')` →
 * `act_meet_your_advisor`. Disambiguated against whatever ids already exist,
 * so two actions titled the same thing get `_2`, `_3`, rather than colliding.
 */
export function slugify(
  prefix: string,
  label: string,
  existingIds: readonly string[],
): string {
  const base =
    prefix +
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48)

  const taken = new Set(existingIds)
  if (!taken.has(base)) return base

  let suffix = 2
  while (taken.has(`${base}_${suffix}`)) suffix++
  return `${base}_${suffix}`
}

/* -------------------------------------------------------------------------- */
/* The action catalog                                                          */
/* -------------------------------------------------------------------------- */

export type CareerActionInput = {
  title: string
  why: string
  categoryId: string
  targetCount: number
  evidence: CareerAction['evidence']
  resourceUrl: string | null
}

export function createCareerAction(
  catalog: CareerAction[],
  input: CareerActionInput,
): CareerAction[] {
  const id = slugify(
    'act_',
    input.title,
    catalog.map((a) => a.id),
  )
  return [...catalog, { id, ...input }]
}

export function updateCareerAction(
  catalog: CareerAction[],
  id: string,
  input: CareerActionInput,
): CareerAction[] {
  return catalog.map((action) =>
    action.id === id ? { ...action, ...input } : action,
  )
}

export function deleteCareerAction(
  catalog: CareerAction[],
  id: string,
): CareerAction[] {
  return catalog.filter((action) => action.id !== id)
}

/**
 * Why an action can't be deleted, or `null` when it safely can be.
 *
 * Deleting an action out from under a placement or a student's progress row
 * would leave a reference to nothing — not a validation error today, since
 * neither schema checks that an id resolves, but a blank row or a silent drop
 * the next time someone reads it. Checked here instead of caught there.
 */
export function describeActionUsage(
  actionId: string,
  map: CareerMap,
  specializations: CareerSpecialization[],
  students: StudentRecord[],
): string | null {
  const reasons: string[] = []

  if (map.placements.some((p) => p.actionId === actionId)) {
    reasons.push('placed on the general map')
  }

  const specializationLabels = specializations
    .filter(
      (specialization) =>
        specialization.placements.some((p) => p.actionId === actionId) ||
        specialization.excludes.includes(actionId),
    )
    .map((specialization) => specialization.label)
  if (specializationLabels.length > 0) {
    reasons.push(`referenced by ${specializationLabels.join(', ')}`)
  }

  const studentCount = students.filter((student) =>
    student.careerMap.progress.some((p) => p.actionId === actionId),
  ).length
  if (studentCount > 0) {
    reasons.push(
      `${studentCount} student${studentCount === 1 ? '' : 's'} ${
        studentCount === 1 ? 'has' : 'have'
      } progress recorded against it`,
    )
  }

  return reasons.length > 0 ? reasons.join('; ') : null
}

/* -------------------------------------------------------------------------- */
/* The general map                                                             */
/* -------------------------------------------------------------------------- */

function placementsEqual(
  a: CareerActionPlacement[],
  b: CareerActionPlacement[],
): boolean {
  if (a.length !== b.length) return false
  const bTerms = new Map(b.map((p) => [p.actionId, p.term]))
  return a.every((p) => bTerms.get(p.actionId) === p.term)
}

/**
 * Replaces every catalog action's term on the general map in one save.
 *
 * The admin form lists the whole catalog with one term picker per row — every
 * action gets an entry in `assignments`, `null` meaning "not on the map" — so
 * this replaces `placements` outright rather than diffing row by row. Version
 * bumps once for the save, not once per row that happened to change.
 */
export function applyMapPlacements(
  map: CareerMap,
  assignments: Map<string, CareerMapTerm | null>,
): CareerMap {
  const placements: CareerActionPlacement[] = []
  for (const [actionId, term] of assignments) {
    if (term) placements.push({ actionId, term })
  }

  if (placementsEqual(placements, map.placements)) return map
  return { ...map, placements, version: map.version + 1 }
}

/* -------------------------------------------------------------------------- */
/* Specializations                                                             */
/* -------------------------------------------------------------------------- */

export type CareerSpecializationInput = {
  trackId: string
  label: string
  description: string
}

export function createCareerSpecialization(
  specializations: CareerSpecialization[],
  input: CareerSpecializationInput,
): CareerSpecialization[] {
  const id = slugify(
    'specialization_',
    input.label,
    specializations.map((item) => item.id),
  )
  return [
    ...specializations,
    { id, ...input, placements: [], excludes: [], requiredSkills: [] },
  ]
}

export function updateCareerSpecializationDetails(
  specializations: CareerSpecialization[],
  id: string,
  input: CareerSpecializationInput,
): CareerSpecialization[] {
  return specializations.map((specialization) =>
    specialization.id === id ? { ...specialization, ...input } : specialization,
  )
}

export function deleteCareerSpecialization(
  specializations: CareerSpecialization[],
  id: string,
): CareerSpecialization[] {
  return specializations.filter((specialization) => specialization.id !== id)
}

/** Why a specialization can't be deleted, or `null` when it safely can be. */
export function describeSpecializationUsage(
  specializationId: string,
  students: StudentRecord[],
): string | null {
  const count = students.filter(
    (student) => student.careerMap.specializationId === specializationId,
  ).length
  if (count === 0) return null
  return `${count} student${count === 1 ? ' is' : 's are'} currently on this specialization`
}

/** One catalog action's status inside a specialization overlay. */
export type SpecializationOverride = CareerMapTerm | 'excluded' | 'default'

export function replaceSpecialization(
  specializations: CareerSpecialization[],
  updated: CareerSpecialization,
): CareerSpecialization[] {
  return specializations.map((specialization) =>
    specialization.id === updated.id ? updated : specialization,
  )
}

/**
 * Rebuilds a specialization's overlay from the full admin form — one
 * `SpecializationOverride` per catalog action, `'default'`
 * meaning "same as the general map". Like `applyMapPlacements`, this replaces
 * both arrays outright because the form is exhaustive over the catalog.
 */
export function applySpecializationOverlay(
  specialization: CareerSpecialization,
  overrides: Map<string, SpecializationOverride>,
): CareerSpecialization {
  const placements: CareerActionPlacement[] = []
  const excludes: string[] = []

  for (const [actionId, value] of overrides) {
    if (value === 'excluded') excludes.push(actionId)
    else if (value !== 'default') placements.push({ actionId, term: value })
  }

  return { ...specialization, placements, excludes }
}

/* -------------------------------------------------------------------------- */
/* Required skills, per specialization                                         */
/* -------------------------------------------------------------------------- */

export type RequiredSkillInput = {
  name: string
  category: SkillCategory
  importance: Importance
  rationale: string | null
}

export function addRequiredSkill(
  specialization: CareerSpecialization,
  input: RequiredSkillInput,
): CareerSpecialization {
  const id = slugify(
    'skill_',
    input.name,
    specialization.requiredSkills.map((s) => s.id),
  )
  const skill: RequiredSkill = { id, ...input }
  return {
    ...specialization,
    requiredSkills: [...specialization.requiredSkills, skill],
  }
}

export function removeRequiredSkill(
  specialization: CareerSpecialization,
  skillId: string,
): CareerSpecialization {
  return {
    ...specialization,
    requiredSkills: specialization.requiredSkills.filter(
      (skill) => skill.id !== skillId,
    ),
  }
}
