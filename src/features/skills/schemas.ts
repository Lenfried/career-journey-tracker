// skills — schemas

import { z } from 'zod'
import {
  skillCategorySchema,
  proficiencySchema,
  importanceSchema,
} from '@/lib/canonical'

const name = z.string().trim().min(1, 'Enter a skill name').max(200)
const optionalText = z
  .string()
  .trim()
  .max(2000)
  .transform((value) => value || null)

export const studentSkillFormSchema = z.object({
  name,
  category: skillCategorySchema,
  proficiency: proficiencySchema,
  evidence: optionalText,
  verifiedByAdvisor: z
    .enum(['on'])
    .optional()
    .transform((value) => value === 'on'),
})

export const studentRequiredSkillFormSchema = z.object({
  name,
  category: skillCategorySchema,
  importance: importanceSchema,
  rationale: optionalText,
})

export {
  studentSkillSchema,
  requiredSkillSchema,
  skillCategorySchema,
  proficiencySchema,
  importanceSchema,
} from '@/lib/canonical'

// Duplicate checks use normaliseSkillName(), just like the derived skill gap.
