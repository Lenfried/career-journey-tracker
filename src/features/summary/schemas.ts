// summary — schemas
//
// Two schemas, and the distinction between them is the whole safety story of
// this feature:
//
//   `summaryInputSchema`  — what we send. Assembled in code from the service
//                           layer. Every number in it is computed by us.
//   `advisorSummarySchema` — what we accept back. Validated before anything
//                           renders it.
//
// The canonical record is NOT one of these. Nothing in `lib/canonical.ts` is
// sent to a model; the input schema is a deliberately smaller shape with the
// identifying fields removed. See `docs/ai-summary.md` for the field-by-field
// reasoning.

import { z } from 'zod'
import {
  goalConfidenceSchema,
  importanceSchema,
  proficiencySchema,
  skillCategorySchema,
} from '@/lib/canonical'

/* -------------------------------------------------------------------------- */
/* What we send                                                                */
/* -------------------------------------------------------------------------- */

/**
 * No `id`, no `emplid`, no name, no email, no advisor name, no `bio`, no
 * artifact URLs, and no absolute dates.
 *
 * A model does not need to know who someone is to say that their résumé is not
 * finished and their target role wants SQL. Everything that identifies the
 * student is left out because it is not needed, and the test suite asserts it
 * stays out.
 */
export const summaryInputSchema = z.object({
  /**
   * True when the record holds nothing at all. Computed here rather than left
   * for the model to infer, because "there is nothing to say" is the one answer
   * a model will not volunteer.
   */
  isEmptyRecord: z.boolean(),

  context: z.object({
    program: z.string(),
    classification: z.string(),
    enrollmentStatus: z.string(),
  }),

  goal: z
    .object({
      statement: z.string(),
      targetRole: z.string().nullable(),
      targetIndustry: z.string().nullable(),
      timeline: z.string().nullable(),
      confidence: goalConfidenceSchema,
      daysSinceLastDiscussed: z.number().int().nullable(),
      advisorNotes: z.string().nullable(),
    })
    .nullable(),

  skills: z.object({
    held: z.array(
      z.object({
        name: z.string(),
        category: skillCategorySchema,
        proficiency: proficiencySchema,
        verifiedByAdvisor: z.boolean(),
      }),
    ),
    required: z.array(
      z.object({
        name: z.string(),
        importance: importanceSchema,
        rationale: z.string().nullable(),
      }),
    ),
    /** Required skills the student does not have. Derived by us, not counted by the model. */
    gap: z.array(z.string()),
    coveredCount: z.number().int(),
    requiredCount: z.number().int(),
  }),

  readiness: z.object({
    artifacts: z.array(z.object({ type: z.string(), status: z.string() })),
    completeCount: z.number().int(),
    total: z.number().int(),
  }),

  milestones: z.object({
    items: z.array(
      z.object({
        type: z.string(),
        title: z.string(),
        description: z.string().nullable(),
        monthsAgo: z.number().int(),
      }),
    ),
    countByType: z.record(z.string(), z.number().int()),
    total: z.number().int(),
  }),

  notes: z.object({
    items: z.array(
      z.object({
        type: z.string(),
        daysAgo: z.number().int(),
        content: z.string(),
      }),
    ),
    includedCount: z.number().int(),
    /**
     * How many notes were withheld because their type is not `aiEligible`.
     *
     * The count goes in the payload and the content does not. The model is told
     * that notes exist which it cannot see, so it does not write "no other
     * concerns are recorded" about a student with two crisis notes.
     */
    withheldSensitiveCount: z.number().int(),
  }),

  followUp: z.object({
    overdue: z.boolean(),
    daysOverdue: z.number().int(),
  }),
})

export type SummaryInput = z.infer<typeof summaryInputSchema>

/* -------------------------------------------------------------------------- */
/* What we accept back                                                         */
/* -------------------------------------------------------------------------- */

const SHORT = 240
const LONG = 1_200

export const recommendationSchema = z.object({
  action: z.string().min(1).max(SHORT),
  rationale: z.string().min(1).max(LONG),
  priority: z.enum(['high', 'medium', 'low']),
})

/**
 * The shape the model must return.
 *
 * Every array may be empty, and that is load-bearing. A student with an empty
 * record has no strengths to list, and a schema with `.min(1)` on `strengths`
 * would force the model to invent one. Length caps exist for the opposite
 * failure: a model that will not stop writing must not be able to break the
 * page layout.
 */
export const advisorSummarySchema = z.object({
  /** One sentence. The line an advisor reads walking into the meeting. */
  headline: z.string().min(1).max(SHORT),
  /** Where the student stands, in a paragraph. */
  standing: z
    .string()
    .min(1)
    .max(LONG * 2),
  strengths: z.array(z.string().min(1).max(SHORT)).max(4),
  gaps: z.array(z.string().min(1).max(SHORT)).max(4),
  recommendations: z.array(recommendationSchema).max(5),
  /** Questions to open the meeting with. */
  talkingPoints: z.array(z.string().min(1).max(SHORT)).max(4),
  /** What the record is missing. Carries the whole answer for an empty record. */
  dataGaps: z.array(z.string().min(1).max(SHORT)).max(6),
})

export type AdvisorSummary = z.infer<typeof advisorSummarySchema>
