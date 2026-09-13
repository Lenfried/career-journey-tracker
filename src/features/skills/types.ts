// skills — types

import type { Importance, Proficiency, SkillCategory } from '@/lib/canonical'

/** A skill the student has. */
export type StudentSkillView = {
  id: string
  /** As entered, whitespace trimmed. Displayed. */
  name: string
  category: SkillCategory
  categoryLabel: string
  proficiency: Proficiency
  proficiencyLabel: string
  evidence: string | null
  verifiedByAdvisor: boolean
  /** True when the target role also asks for this skill. */
  matchesRequirement: boolean
}

/** A skill the target role requires. */
export type RequiredSkillView = {
  id: string
  name: string
  category: SkillCategory
  categoryLabel: string
  importance: Importance
  importanceLabel: string
  rationale: string | null
  /** True when the student has a skill with a matching normalised name. */
  covered: boolean
}

/**
 * The two lists plus the derived gap.
 *
 * The gap is never stored. It is recomputed on every read from the two lists,
 * which means it cannot go stale — the alternative, a `gap` column updated on
 * write, is wrong the first time someone edits a skill through a path that
 * forgets to recompute it.
 */
export type SkillsView = {
  skills: StudentSkillView[]
  requiredSkills: RequiredSkillView[]
  /** Required skills the student does not have, worst gap first. */
  gap: RequiredSkillView[]
  coveredCount: number
}
