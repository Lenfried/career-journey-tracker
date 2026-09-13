// goals — queries

import { formatTimestamp } from '@/lib/dates'
import { loadStudent } from '@/lib/fixtures'
import { GOAL_CONFIDENCE_LABELS } from '@/lib/labels'
import type { CareerGoalView } from './types'

/** A student's career goal, or `null` when none is set. */
export async function getStudentGoal(
  studentId: string,
): Promise<CareerGoalView | null> {
  const goal = loadStudent(studentId)?.goal
  if (!goal) return null

  return {
    statement: goal.statement,
    targetIndustry: goal.targetIndustry,
    targetRole: goal.targetRole,
    timeline: goal.timeline,
    confidence: goal.confidence,
    confidenceLabel: GOAL_CONFIDENCE_LABELS[goal.confidence],
    lastDiscussedAt: goal.lastDiscussedAt,
    lastDiscussedLabel: goal.lastDiscussedAt
      ? formatTimestamp(goal.lastDiscussedAt)
      : null,
    advisorNotes: goal.advisorNotes,
  }
}
