// career-map — schemas

import { z } from 'zod'
import {
  careerMapTermSchema,
  EVIDENCE_KINDS,
  importanceSchema,
  skillCategorySchema,
} from '@/lib/canonical'
import type {
  CareerActionInput,
  CareerSpecializationInput,
  RequiredSkillInput,
} from './admin'

export {
  careerActionSchema,
  careerActionPlacementSchema,
  careerActionProgressSchema,
  careerActionStatusSchema,
  careerMapSchema,
  careerMapTermSchema,
  careerSpecializationSchema,
  careerTrackSchema,
  studentCareerMapSchema,
} from '@/lib/canonical'

// Week 2 adds `markCareerActionSchema` and `setCareerPathSchema` here — the
// same schemas the forms resolve against, once completion is a student-facing
// write rather than an admin one.

/**
 * `"kind:typeId"` from the evidence picker's single `<select>`, or `""` for no
 * hint. One field rather than a kind select plus a type select because a
 * native form can't filter the second select's options to match the first
 * without client JS — one combined value, split server-side, sidesteps that.
 */
const evidenceFieldSchema = z
  .string()
  .refine(
    (value) =>
      value === '' ||
      EVIDENCE_KINDS.some((kind) => value.startsWith(`${kind}:`)),
    'Not a recognised evidence option',
  )

/** One action form (create or edit) from the admin screen. */
export const careerActionFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required'),
    why: z.string().trim().min(1, 'Say why this is worth doing'),
    categoryId: z.string().min(1, 'Pick a category'),
    targetCount: z.coerce.number().int().positive('Must be at least 1'),
    evidence: evidenceFieldSchema,
    resourceUrl: z.string(),
  })
  .superRefine((value, ctx) => {
    if (
      value.resourceUrl.trim() !== '' &&
      !/^https?:\/\//.test(value.resourceUrl.trim())
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['resourceUrl'],
        message: 'Must start with http:// or https://',
      })
    }
  })
  .transform((value): CareerActionInput => {
    const separator = value.evidence.indexOf(':')
    const kind =
      separator === -1
        ? null
        : (value.evidence.slice(
            0,
            separator,
          ) as (typeof EVIDENCE_KINDS)[number])
    const typeId = separator === -1 ? null : value.evidence.slice(separator + 1)

    return {
      title: value.title,
      why: value.why,
      categoryId: value.categoryId,
      targetCount: value.targetCount,
      evidence: kind && typeId ? { kind, typeId } : null,
      resourceUrl:
        value.resourceUrl.trim() === '' ? null : value.resourceUrl.trim(),
    }
  })

export const careerSpecializationFormSchema = z.object({
  trackId: z.string().trim().min(1, 'Pick a track'),
  label: z.string().trim().min(1, 'Label is required'),
  description: z.string().trim().min(1, 'Description is required'),
}) satisfies z.ZodType<CareerSpecializationInput>

export const requiredSkillFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    category: skillCategorySchema,
    importance: importanceSchema,
    rationale: z.string().trim(),
  })
  .transform((value): RequiredSkillInput => ({
    name: value.name,
    category: value.category,
    importance: value.importance,
    rationale: value.rationale === '' ? null : value.rationale,
  }))

/** One cell of the general-map assignment table: a term, or unplaced. */
export const mapAssignmentValueSchema = z.union([
  careerMapTermSchema,
  z.literal(''),
])

/** One cell of a specialization overlay: a term, excluded, or the default. */
export const specializationOverrideValueSchema = z.union([
  careerMapTermSchema,
  z.literal('excluded'),
  z.literal('default'),
])

export const specializationActionOverrideFormSchema = z.object({
  actionId: z.string().trim().min(1, 'Pick an action'),
  override: specializationOverrideValueSchema,
})
