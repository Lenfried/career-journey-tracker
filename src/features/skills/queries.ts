// skills — queries

import {
  IMPORTANCES,
  normaliseSkillName,
  type RequiredSkill,
  type StudentSkill,
} from '@/lib/canonical'
import { loadStudent } from '@/lib/fixtures'
import {
  IMPORTANCE_LABELS,
  PROFICIENCY_LABELS,
  SKILL_CATEGORY_LABELS,
} from '@/lib/labels'
import type { RequiredSkillView, SkillsView, StudentSkillView } from './types'

const EMPTY: SkillsView = {
  skills: [],
  requiredSkills: [],
  gap: [],
  coveredCount: 0,
}

/** Both skill lists for a student, with the gap derived between them. */
export async function getStudentSkills(studentId: string): Promise<SkillsView> {
  const student = loadStudent(studentId)
  if (!student) return EMPTY
  return deriveSkillsView(student.skills, student.requiredSkills)
}

/* -------------------------------------------------------------------------- */
/* Derivation                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Pure, so the matching rule can be tested directly against the awkward cases:
 * stray whitespace, mixed case, and a required skill nobody has.
 */
export function deriveSkillsView(
  skills: StudentSkill[],
  requiredSkills: RequiredSkill[],
): SkillsView {
  // Both sides go through `normaliseSkillName`. Comparing raw strings would
  // report " python " and "Python" as different skills, and the gap display
  // would then tell an advisor to teach a student something they already know.
  const held = new Set(skills.map((skill) => normaliseSkillName(skill.name)))
  const required = new Set(
    requiredSkills.map((skill) => normaliseSkillName(skill.name)),
  )

  const skillViews: StudentSkillView[] = skills
    .map((skill) => ({
      id: skill.id,
      name: skill.name.trim(),
      category: skill.category,
      categoryLabel: SKILL_CATEGORY_LABELS[skill.category],
      proficiency: skill.proficiency,
      proficiencyLabel: PROFICIENCY_LABELS[skill.proficiency],
      evidence: skill.evidence,
      verifiedByAdvisor: skill.verifiedByAdvisor,
      matchesRequirement: required.has(normaliseSkillName(skill.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const requiredViews: RequiredSkillView[] = requiredSkills
    .map((skill) => ({
      id: skill.id,
      name: skill.name.trim(),
      category: skill.category,
      categoryLabel: SKILL_CATEGORY_LABELS[skill.category],
      importance: skill.importance,
      importanceLabel: IMPORTANCE_LABELS[skill.importance],
      rationale: skill.rationale,
      covered: held.has(normaliseSkillName(skill.name)),
    }))
    .sort(byImportanceThenName)

  return {
    skills: skillViews,
    requiredSkills: requiredViews,
    gap: requiredViews.filter((skill) => !skill.covered),
    coveredCount: requiredViews.filter((skill) => skill.covered).length,
  }
}

/** Essential first — an advisor reads the top of this list and stops. */
function byImportanceThenName(a: RequiredSkillView, b: RequiredSkillView) {
  const rank =
    IMPORTANCES.indexOf(b.importance) - IMPORTANCES.indexOf(a.importance)
  return rank || a.name.localeCompare(b.name)
}
