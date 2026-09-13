/**
 * Display labels for the canonical schema's fixed vocabularies.
 *
 * These are unions rather than lookup rows (see `canonical.ts`), so their
 * human-readable form is code rather than data. Keeping every one of them here
 * means a wording change is one edit, not a grep.
 *
 * Lookup rows — programs, note types, milestone types, artifact types — carry
 * their own labels. Use `resolveLabel()` from `lib/lookups.ts` for those.
 */

import type {
  ArtifactStatus,
  Classification,
  EnrollmentStatus,
  GoalConfidence,
  Importance,
  Proficiency,
  SkillCategory,
} from './canonical'

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  freshman: 'Freshman',
  sophomore: 'Sophomore',
  junior: 'Junior',
  senior: 'Senior',
}

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  enrolled: 'Enrolled',
  'leave-of-absence': 'Leave of absence',
  graduated: 'Graduated',
  withdrawn: 'Withdrawn',
}

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  technical: 'Technical',
  soft: 'Soft',
  domain: 'Domain',
  tool: 'Tool',
  language: 'Language',
}

export const PROFICIENCY_LABELS: Record<Proficiency, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  'nice-to-have': 'Nice to have',
  important: 'Important',
  essential: 'Essential',
}

export const GOAL_CONFIDENCE_LABELS: Record<GoalConfidence, string> = {
  low: 'Low confidence',
  medium: 'Medium confidence',
  high: 'High confidence',
}

export const ARTIFACT_STATUS_LABELS: Record<ArtifactStatus, string> = {
  none: 'Not started',
  'in-progress': 'In progress',
  'needs-review': 'Needs review',
  complete: 'Complete',
}
