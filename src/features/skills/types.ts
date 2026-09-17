// skills — types

import type {
  Importance,
  Proficiency,
  RequiredSkill,
  SkillCategory,
} from '@/lib/canonical'

/**
 * Where a requirement came from.
 *
 * `specialization` — the focused path asks for it. These swap out the moment
 * the student changes specialization, which is the point: what a path demands
 * is a fact about the path, not about the student.
 * `student` — an advisor added it for this student specifically. Survives a
 * specialization change, because somebody put it there on purpose.
 */
export type RequiredSkillSource = 'specialization' | 'student'

/** A required skill on its way into the view, tagged with where it came from. */
export type SourcedRequiredSkill = RequiredSkill & {
  /** Absent means `student` — an unattributed list is an advisor's list. */
  source?: RequiredSkillSource
}

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
  source: RequiredSkillSource
  /** "Required by the AI/ML research specialization", or advisor-added. */
  sourceLabel: string
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
