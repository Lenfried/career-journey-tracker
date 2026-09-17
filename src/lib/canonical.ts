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
  /** Ordered — career map actions group under these, in this order. */
  actionCategories: z.array(lookupItemSchema),
  /**
   * Why an advisor moved a career map action to a different term. A lookup and
   * not a union: "transferred in" and "course load" are the two everyone
   * expects, and the third one will arrive from an advisor, not a developer.
   */
  moveReasons: z.array(lookupItemSchema),
})

export type LookupItem = z.infer<typeof lookupItemSchema>
export type Lookups = z.infer<typeof lookupsSchema>
export type LookupName = keyof Lookups

/* -------------------------------------------------------------------------- */
/* Career map                                                                  */
/*                                                                            */
/* A department-authored plan of recommended career actions laid out across    */
/* the eleven terms of a four-year degree. It is three separate pieces on      */
/* purpose:                                                                    */
/*                                                                            */
/* The student's own assignment is here, next to the rest of the student record. */
/* The department's template — the catalog, the map, the tracks — is further     */
/* down, after the data groups, because a track states the skills a path         */
/* requires and so has to come after `requiredSkillSchema`.                      */
/*                                                                              */
/*   1. `careerActions` — the catalog. Every action is defined ONCE, with a     */
/*      stable id, no matter how many tracks recommend it. This is what lets a  */
/*      student change track without losing credit for work already done:       */
/*      progress is keyed on the action id, and the same id is the same action  */
/*      everywhere. Defining "do a mock interview" separately inside each track */
/*      would silently uncheck it the day a student switched.                   */
/*   2. `careerMaps` — the general plan every student gets: which action sits   */
/*      in which term.                                                          */
/*   3. `careerTracks` — a specialisation (backend, ML research, quant) layered */
/*      ON TOP of the general plan rather than replacing it. A track may add an */
/*      action, exclude one that does not apply to it, or move one to a         */
/*      different term. It may not restate what an action says — that lives in  */
/*      the catalog, once, so a wording fix reaches every track at the same     */
/*      time.                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The eleven terms of the map, in order.
 *
 * Summers are in, and they carry real work. Internship and new-grad postings
 * open in August, so the summer before junior year is when preparation has to
 * happen — treating summer as a gap puts the prep after the wave it was meant
 * to prepare for.
 *
 * Ordered: `CAREER_MAP_TERMS.indexOf(term)` is a position on the timeline, so
 * this is a union rather than a lookup table. Adding a fifth year is a design
 * change, not configuration.
 */
export const CAREER_MAP_TERMS = [
  'y1-fall',
  'y1-spring',
  'y1-summer',
  'y2-fall',
  'y2-spring',
  'y2-summer',
  'y3-fall',
  'y3-spring',
  'y3-summer',
  'y4-fall',
  'y4-spring',
] as const

/**
 * Where a student is against an action.
 *
 * Advisor-set. There is no student self-service — an action is complete when an
 * advisor confirms it in a meeting, which is why every progress row records who
 * marked it and when.
 *
 * `not-applicable` is one state rather than three (skipped / waived / exempt)
 * because they are the same UI need — stop counting this against the student —
 * and three words for one need get used inconsistently. It carries a reason.
 */
export const CAREER_ACTION_STATUSES = [
  'not-started',
  'in-progress',
  'done',
  'not-applicable',
] as const

/**
 * Where an action's evidence hint comes from.
 *
 * The app already records most of what the map recommends: a career fair is a
 * milestone, a LinkedIn profile is a readiness artifact, an advising meeting is
 * a note. An action can point at one of those, and the service layer counts
 * matching records and shows the advisor "2 networking milestones logged".
 *
 * A hint is a hint. It never marks an action done on its own — the advisor
 * still confirms — because the one thing worse than an advisor ticking a box is
 * the app ticking it for them and being wrong.
 */
export const EVIDENCE_KINDS = ['milestone', 'artifact', 'note'] as const

export const careerMapTermSchema = z.enum(CAREER_MAP_TERMS)
export const careerActionStatusSchema = z.enum(CAREER_ACTION_STATUSES)
export const evidenceKindSchema = z.enum(EVIDENCE_KINDS)

export type CareerMapTerm = z.infer<typeof careerMapTermSchema>
export type CareerActionStatus = z.infer<typeof careerActionStatusSchema>
export type EvidenceKind = z.infer<typeof evidenceKindSchema>

/** A CUNY-style academic term code: `2026FA`, `2027SP`, `2027SU`. */
export const academicTermSchema = z.string().regex(/^\d{4}(FA|SP|SU)$/)

/**
 * One advisor's call on one action, for one student — both what state it is in
 * and, when they have moved it, which term it belongs in for this student.
 *
 * Status and placement live in one row because they are the same thing from the
 * advisor's side: a per-student override of the template, made in a meeting,
 * with a name against it.
 */
export const careerActionProgressSchema = z
  .strictObject({
    actionId: z.string().min(1),
    status: careerActionStatusSchema,
    /** Against the action's `targetCount`. 0 unless the action is countable. */
    completedCount: z.number().int().min(0),
    /**
     * The term this action belongs in for this student, overriding the template.
     *
     * This is what onboarding a transfer student looks like. The map says the
     * informational interview was a Year 2 job; the student arrived in Year 3;
     * the advisor pulls the ones that still matter into the current term and
     * leaves the rest in history. Same mechanism carries a missed action forward
     * for anyone whose course load or job got in the way.
     *
     * `null` means the template's own placement stands.
     */
    movedToTerm: careerMapTermSchema.nullable(),
    /** A `moveReasons` lookup id. Set with `movedToTerm`, `null` without it. */
    moveReasonId: z.string().nullable(),
    /** The advisor who last touched the row. FERPA: who said so, and when. */
    markedBy: z.string().min(1),
    markedAt: timestampSchema,
    /** Required in practice for `not-applicable` — why it was waived. */
    note: z.string().nullable(),
  })
  // A move without a reason is how a per-student plan becomes undocumented.
  // Next year's advisor inherits the student, not the conversation.
  .refine((row) => (row.movedToTerm === null) === (row.moveReasonId === null), {
    message: 'movedToTerm and moveReasonId must be set together',
  })

/**
 * A student's place on the map.
 *
 * There is one map and everyone is on it. A student does not get "assigned" to
 * it and there is no version to pin: the map is the department's plan, the same
 * eleven terms for everybody, and a track overlays a specialisation on top. No
 * track means the general map, which is the common case.
 *
 * What is per-student is only this: which track, and what has happened term by
 * term. Where a student sits on the map, and which terms predate their arrival,
 * are derived from `entryTerm` and `classification` — they are facts about the
 * student's own calendar, not something for an advisor to keep in step by hand.
 *
 * Progress is sparse — only actions an advisor has actually touched appear, and
 * the service layer fills the rest in at `not-started`, the same way the
 * readiness checklist fills missing artifact rows.
 *
 * Progress is keyed on action id and never on track, which is the whole point:
 * change `trackId` and every shared action stays exactly as it was. Rows for
 * actions the new track does not include are kept, not deleted — a sophomore
 * who spent a year on research before switching to industry did that work, and
 * erasing it punishes exactly the exploration this tool exists to encourage.
 */
export const studentCareerMapSchema = z.strictObject({
  trackId: z.string().nullable(),
  trackSetAt: timestampSchema.nullable(),
  progress: z.array(careerActionProgressSchema),
})

export type CareerActionProgress = z.infer<typeof careerActionProgressSchema>
export type StudentCareerMap = z.infer<typeof studentCareerMapSchema>

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
  /**
   * The term the student started at York — `2024FA` for a transfer who arrived
   * in fall 2024, not the term they would have started as a freshman.
   *
   * The career map does not derive a student's position from this today (see
   * `deriveMapPosition` in the career-map feature, which trusts `classification`
   * because the registrar maintains it and it never disagrees with the rest of
   * the app). It is here because it is the fact a real import carries, and
   * because "entered 2023FA, still classified sophomore" is the signal that
   * someone is part-time or has stopped out — which an advisor wants to see.
   */
  entryTerm: academicTermSchema,
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
  /** Everyone is on the map. What varies is the track and the progress. */
  careerMap: studentCareerMapSchema,
})

/* -------------------------------------------------------------------------- */
/* Career map — the department's template                                      */
/*                                                                            */
/* Everything above is what one student carries. This is what the department   */
/* publishes: the action catalog, the general map, and the tracks that layer   */
/* over it. It sits below the data groups because a track states the skills    */
/* its path requires, and that schema is one of the groups.                    */
/* -------------------------------------------------------------------------- */

/** Where an action's completion can be corroborated from existing records. */
export const actionEvidenceSchema = z.strictObject({
  kind: evidenceKindSchema,
  /** A milestone type, artifact type or note type id — a lookup row. */
  typeId: z.string().min(1),
})

/**
 * One recommended action, defined once and referenced by every map and track
 * that recommends it.
 */
export const careerActionSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  /**
   * Why this is worth doing, in one line. The paper career maps all omit this,
   * and it is most of what makes a student act on a row rather than skim it.
   */
  why: z.string().min(1),
  categoryId: z.string().min(1),
  /** How many times. 1 for most things, 2 for "attend two seminar talks". */
  targetCount: z.number().int().positive(),
  evidence: actionEvidenceSchema.nullable(),
  resourceUrl: z.url().nullable(),
})

/** An action placed in a term. The unit both maps and tracks are built from. */
export const careerActionPlacementSchema = z.strictObject({
  actionId: z.string().min(1),
  term: careerMapTermSchema,
})

/** The general plan. Everyone gets this; tracks layer on top of it. */
export const careerMapSchema = z.strictObject({
  id: z.string().min(1),
  /**
   * Bumped whenever a placement is added, removed or moved. A student pins the
   * version they were assigned, so editing the map never silently rewrites what
   * someone already partway through was asked to do — the catalog-year rule
   * that degree audits have used for decades.
   */
  version: z.number().int().positive(),
  label: z.string().min(1),
  description: z.string().min(1),
  /**
   * Half of this advice has a date in it — application windows move every year.
   * This is the date a human last checked that the content is still true.
   */
  lastReviewed: calendarDateSchema,
  placements: z.array(careerActionPlacementSchema),
})

/**
 * A specialisation layered over the general map.
 *
 * Three operations, and only three: `placements` adds an action, or moves one
 * the general map already places; `excludes` drops one that does not apply.
 * Nothing here can change what an action *says*.
 */
export const careerTrackSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  placements: z.array(careerActionPlacementSchema),
  excludes: z.array(z.string().min(1)),
  /**
   * What this path asks a student to be able to do.
   *
   * Required skills belong to the track, not to the student. A student's own
   * skills are theirs and do not move; what a path demands of them changes the
   * moment they change path, and the skills gap should follow. A student can
   * still carry extra requirements of their own — see `requiredSkills` on the
   * student record — and those survive a track change because an advisor put
   * them there deliberately.
   */
  requiredSkills: z.array(requiredSkillSchema),
})

export type ActionEvidence = z.infer<typeof actionEvidenceSchema>
export type CareerAction = z.infer<typeof careerActionSchema>
export type CareerActionPlacement = z.infer<typeof careerActionPlacementSchema>
export type CareerMap = z.infer<typeof careerMapSchema>
export type CareerTrack = z.infer<typeof careerTrackSchema>

/**
 * Group 7 — the lookups, the career map template, plus every student. This is
 * the whole dataset.
 */
export const canonicalDatasetSchema = z.strictObject({
  version: z.number().int().positive(),
  /** JSON has no comments. This is the fixture file's header note; ignored. */
  _comment: z.array(z.string()).optional(),
  lookups: lookupsSchema,
  /** Every action, defined once. Maps and tracks reference these by id. */
  careerActions: z.array(careerActionSchema),
  careerMaps: z.array(careerMapSchema),
  careerTracks: z.array(careerTrackSchema),
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
