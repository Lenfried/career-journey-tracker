// skills — queries

import {
  IMPORTANCES,
  normaliseSkillName,
  type RequiredSkill,
  type StudentSkill,
} from '@/lib/canonical'
import { loadCareerTrack, loadStudent } from '@/lib/fixtures'
import {
  IMPORTANCE_LABELS,
  PROFICIENCY_LABELS,
  SKILL_CATEGORY_LABELS,
} from '@/lib/labels'
import type {
  RequiredSkillView,
  SkillsView,
  SourcedRequiredSkill,
  StudentSkillView,
} from './types'

const EMPTY: SkillsView = {
  skills: [],
  requiredSkills: [],
  gap: [],
  coveredCount: 0,
}

/**
 * Both skill lists for a student, with the gap derived between them.
 *
 * Required skills come from two places and are merged here: the track the
 * student is on, and anything an advisor added for this student specifically.
 * Change track and the first set swaps; the student's own skills and the
 * advisor's own additions are untouched, and the gap recomputes against the new
 * path on the next read.
 */
export async function getStudentSkills(studentId: string): Promise<SkillsView> {
  const student = loadStudent(studentId)
  if (!student) return EMPTY

  const track = loadCareerTrack(student.careerMap?.trackId ?? null)

  return deriveSkillsView(
    student.skills,
    mergeRequiredSkills(track?.requiredSkills ?? [], student.requiredSkills),
    track?.label ?? null,
  )
}

/**
 * The track's requirements plus the advisor's, de-duplicated by the same
 * normalisation the gap uses.
 *
 * The student's own entry wins a collision. Both lists are written by people;
 * when an advisor has written a rationale for *this* student next to a skill
 * the track also names, theirs is the one with the context in it.
 */
export function mergeRequiredSkills(
  fromTrack: RequiredSkill[],
  fromStudent: RequiredSkill[],
): SourcedRequiredSkill[] {
  const merged = new Map<string, SourcedRequiredSkill>()

  for (const skill of fromTrack) {
    merged.set(normaliseSkillName(skill.name), { ...skill, source: 'track' })
  }
  for (const skill of fromStudent) {
    merged.set(normaliseSkillName(skill.name), { ...skill, source: 'student' })
  }

  return [...merged.values()]
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
  requiredSkills: SourcedRequiredSkill[],
  trackLabel: string | null = null,
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
      source: skill.source ?? 'student',
      sourceLabel:
        skill.source === 'track' && trackLabel
          ? `Required by the ${trackLabel} track`
          : 'Added by an advisor',
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
