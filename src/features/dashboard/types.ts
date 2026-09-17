// dashboard — types

import type { CareerMapStatus } from '@/features/career-map/types'
import type { StudentSummary } from '@/features/students/types'

/** A student who is waiting on their advisor. */
export type OverdueStudent = {
  student: StudentSummary
  followUpDate: string
  followUpDateLabel: string
  daysOverdue: number
}

/** A student who is behind on the plan they were put on. */
export type BehindStudent = {
  student: StudentSummary
  status: CareerMapStatus
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
  /**
   * Students behind on career map actions, furthest behind first, capped.
   *
   * Capped because this list is not like the overdue one: a follow-up date
   * passing is an exception, whereas being behind on a four-year plan is the
   * normal condition of most students most of the time. An uncapped list would
   * be the roster, which is not a call to action.
   */
  behindOnMap: BehindStudent[]
  /** How many students are behind in total, not just the ones listed. */
  behindCount: number
  recentlyUpdated: StudentSummary[]
}
