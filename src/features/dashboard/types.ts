// dashboard — types

import type { StudentSummary } from '@/features/students/types'

/** A student who is waiting on their advisor. */
export type OverdueStudent = {
  student: StudentSummary
  followUpDate: string
  followUpDateLabel: string
  daysOverdue: number
}

/**
 * Everything the dashboard renders — MVP screen 7: a student count, an overdue
 * follow-up list, and recently updated students. No charts. Analytics is
 * Phase 2 and the distinction matters: this page answers "what needs my
 * attention today", not "how is the cohort doing".
 */
export type DashboardSummary = {
  studentCount: number
  overdueCount: number
  overdue: OverdueStudent[]
  recentlyUpdated: StudentSummary[]
}
