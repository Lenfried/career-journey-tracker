/**
 * The canonical schema — the agreed shape of a student record inside the
 * application. This is the contract between the UI, the service layer
 * (`src/features/<name>/queries.ts`), and whatever data source sits behind it.
 *
 * It is NOT a database schema. The human-readable explanation of every field,
 * and the rules for changing it, live in `docs/canonical-schema.md`.
 *
 * Feature `schemas.ts` files re-export the slices they own, so a feature keeps a
 * single import site, but the definitions live here — one student record cannot
 * be defined in seven places and stay coherent.
 */

import { z } from 'zod'

/* -------------------------------------------------------------------------- */
/* Fixed vocabularies                                                          */
/*                                                                             */
/* These are unions rather than lookup rows because the UI reasons about their  */
/* order and meaning. Adding a fifth proficiency level is a design change, not  */
/* a configuration change. Contrast with the lookups below.                     */
/* -------------------------------------------------------------------------- */

export const CLASSIFICATIONS = [
  'freshman',
  'sophomore',
  'junior',
  'senior',
] as const

export const ENROLLMENT_STATUSES = [
  'enrolled',
  'leave-of-absence',
  'graduated',
  'withdrawn',
] as const

export const SKILL_CATEGORIES = [
  'technical',
  'soft',
  'domain',
  'tool',
  'language',
] as const

export const PROFICIENCIES = ['beginner', 'intermediate', 'advanced'] as const

export const IMPORTANCES = ['nice-to-have', 'important', 'essential'] as const

export const GOAL_CONFIDENCES = ['low', 'medium', 'high'] as const

/** Ordered worst to best. `ARTIFACT_STATUSES.indexOf(s)` is a meaningful score. */
export const ARTIFACT_STATUSES = [
  'none',
  'in-progress',
  'needs-review',
  'complete',
] as const

export const classificationSchema = z.enum(CLASSIFICATIONS)
export const enrollmentStatusSchema = z.enum(ENROLLMENT_STATUSES)
export const skillCategorySchema = z.enum(SKILL_CATEGORIES)
export const proficiencySchema = z.enum(PROFICIENCIES)
export const importanceSchema = z.enum(IMPORTANCES)
export const goalConfidenceSchema = z.enum(GOAL_CONFIDENCES)
export const artifactStatusSchema = z.enum(ARTIFACT_STATUSES)

export type Classification = z.infer<typeof classificationSchema>
export type EnrollmentStatus = z.infer<typeof enrollmentStatusSchema>
export type SkillCategory = z.infer<typeof skillCategorySchema>
export type Proficiency = z.infer<typeof proficiencySchema>
export type Importance = z.infer<typeof importanceSchema>
export type GoalConfidence = z.infer<typeof goalConfidenceSchema>
export type ArtifactStatus = z.infer<typeof artifactStatusSchema>

/* -------------------------------------------------------------------------- */
/* Dates                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A calendar date, `YYYY-MM-DD`. No time, no zone. The day an advising session
 * happened is a calendar fact and must not shift when read from another
 * timezone. Format these with `formatCalendarDate()` in `lib/dates.ts` — never
 * by way of `new Date(str)`, which parses bare dates as UTC midnight and renders
 * as the previous day in America/New_York.
 */
export const calendarDateSchema = z.iso.date()

/** A full ISO-8601 instant. Rendered in America/New_York. */
export const timestampSchema = z.iso.datetime()

/* -------------------------------------------------------------------------- */
/* Lookups                                                                     */
/*                                                                             */
/* Milestone types, note types, programs and artifact types are data, not code. */
/* Adding a tenth milestone type must not require a deploy.                     */
/* -------------------------------------------------------------------------- */

export const lookupItemSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
})

export const lookupsSchema = z.strictObject({
  programs: z.array(lookupItemSchema),
  noteTypes: z.array(lookupItemSchema),
  milestoneTypes: z.array(lookupItemSchema),
  /** Ordered — the readiness checklist renders in this order. */
  artifactTypes: z.array(lookupItemSchema),
})

export type LookupItem = z.infer<typeof lookupItemSchema>
export type Lookups = z.infer<typeof lookupsSchema>
export type LookupName = keyof Lookups

/* -------------------------------------------------------------------------- */
/* The seven data groups                                                       */
/* -------------------------------------------------------------------------- */

/** Group 1 — student identity. */
export const studentIdentitySchema = z.strictObject({
  id: z.string().min(1),
  /** CUNY EMPLID — the natural key any real import matches on. */
  emplid: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  /** When present, display this everywhere instead of `firstName`. */
  preferredName: z.string().min(1).nullable(),
  email: z.email(),
  programId: z.string().min(1),
  classification: classificationSchema,
  enrollmentStatus: enrollmentStatusSchema,
  advisor: z.string().min(1).nullable(),
  bio: z.string().nullable(),
  updatedAt: timestampSchema,
})

/** Group 2 — career goals. `null` on the student record when none is set. */
export const careerGoalSchema = z.strictObject({
  statement: z.string().min(1),
  targetIndustry: z.string().nullable(),
  targetRole: z.string().nullable(),
  timeline: z.string().nullable(),
  confidence: goalConfidenceSchema,
  lastDiscussedAt: timestampSchema.nullable(),
  advisorNotes: z.string().nullable(),
})

/** Group 3a — skills the student has. */
export const studentSkillSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  category: skillCategorySchema,
  proficiency: proficiencySchema,
  evidence: z.string().nullable(),
  verifiedByAdvisor: z.boolean(),
})

/** Group 3b — skills the target role requires. */
export const requiredSkillSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  category: skillCategorySchema,
  importance: importanceSchema,
  rationale: z.string().nullable(),
})

/** Group 4 — readiness artifacts. */
export const readinessArtifactSchema = z.strictObject({
  typeId: z.string().min(1),
  status: artifactStatusSchema,
  url: z.string().nullable(),
  advisorNotes: z.string().nullable(),
})

/** Group 5 — advising notes. */
export const advisingNoteSchema = z.strictObject({
  id: z.string().min(1),
  sessionDate: calendarDateSchema,
  typeId: z.string().min(1),
  content: z.string().min(1),
  followUpDate: calendarDateSchema.nullable(),
  recordedBy: z.string().min(1),
})

/** Group 6 — career milestones. */
export const careerMilestoneSchema = z.strictObject({
  id: z.string().min(1),
  typeId: z.string().min(1),
  title: z.string().min(1),
  completedDate: calendarDateSchema,
  description: z.string().nullable(),
  recordedBy: z.string().min(1),
})

/**
 * A whole student record. The groups nest under the student in the fixture file
 * because that is how a human maintains it; the service layer flattens where a
 * screen needs a flat list.
 */
export const studentRecordSchema = studentIdentitySchema.extend({
  goal: careerGoalSchema.nullable(),
  skills: z.array(studentSkillSchema),
  requiredSkills: z.array(requiredSkillSchema),
  /** May be partial or empty — the service layer fills missing types at `none`. */
  artifacts: z.array(readinessArtifactSchema),
  notes: z.array(advisingNoteSchema),
  milestones: z.array(careerMilestoneSchema),
})

/** Group 7 — the lookups, plus every student. This is the whole dataset. */
export const canonicalDatasetSchema = z.strictObject({
  version: z.number().int().positive(),
  /** JSON has no comments. This is the fixture file's header note; ignored. */
  _comment: z.array(z.string()).optional(),
  lookups: lookupsSchema,
  students: z.array(studentRecordSchema),
})

export type StudentIdentity = z.infer<typeof studentIdentitySchema>
export type CareerGoal = z.infer<typeof careerGoalSchema>
export type StudentSkill = z.infer<typeof studentSkillSchema>
export type RequiredSkill = z.infer<typeof requiredSkillSchema>
export type ReadinessArtifact = z.infer<typeof readinessArtifactSchema>
export type AdvisingNote = z.infer<typeof advisingNoteSchema>
export type CareerMilestone = z.infer<typeof careerMilestoneSchema>
export type StudentRecord = z.infer<typeof studentRecordSchema>
export type CanonicalDataset = z.infer<typeof canonicalDatasetSchema>

/* -------------------------------------------------------------------------- */
/* Derivations shared across features                                          */
/* -------------------------------------------------------------------------- */

/**
 * The one rule for comparing skill names. Free-text entry produces "Python",
 * "python " and "Python" from two advisors; without a single normalisation rule
 * the derived skills gap reports matches that a human would call obvious.
 *
 * Reads and writes must both go through this, or they will disagree.
 */
export function normaliseSkillName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** The name to show. Preferred name wins everywhere it exists. */
export function displayName(
  student: Pick<StudentIdentity, 'firstName' | 'lastName' | 'preferredName'>,
): string {
  return `${student.preferredName ?? student.firstName} ${student.lastName}`
}

/** "Okonkwo, Amara" — for roster tables sorted by surname. */
export function sortableName(
  student: Pick<StudentIdentity, 'firstName' | 'lastName' | 'preferredName'>,
): string {
  return `${student.lastName}, ${student.preferredName ?? student.firstName}`
}
