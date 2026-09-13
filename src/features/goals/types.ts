// goals — types

import type { GoalConfidence } from '@/lib/canonical'

/**
 * A student's career goal, ready to render.
 *
 * The query returns `null` rather than a blank version of this when no goal is
 * set. "No goal yet" is a real and common state — a freshman two weeks in has
 * not got one — and the UI should say so plainly rather than show an empty
 * form's worth of dashes.
 */
export type CareerGoalView = {
  statement: string
  targetIndustry: string | null
  targetRole: string | null
  timeline: string | null
  confidence: GoalConfidence
  confidenceLabel: string
  lastDiscussedAt: string | null
  lastDiscussedLabel: string | null
  advisorNotes: string | null
}
