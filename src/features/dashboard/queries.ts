// dashboard — queries
//
// This feature owns no data of its own. It composes the other features'
// service-layer reads, which is why it imports from `features/*` rather than
// from `lib/fixtures` — the dashboard is a consumer of the service layer, not
// a second copy of it.

import { listCareerMapStatuses } from '@/features/career-map/queries'
import { listFollowUpStatuses } from '@/features/notes/queries'
import {
  countStudents,
  listRecentlyUpdatedStudents,
  listStudents,
} from '@/features/students/queries'
import { formatCalendarDate } from '@/lib/dates'
import type { BehindStudent, DashboardSummary, OverdueStudent } from './types'

const RECENTLY_UPDATED_COUNT = 5
const BEHIND_COUNT = 5

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [studentCount, recentlyUpdated, overdue, behind] = await Promise.all([
    countStudents(),
    listRecentlyUpdatedStudents(RECENTLY_UPDATED_COUNT),
    listOverdueStudents(),
    listStudentsBehindOnMap(),
  ])

  return {
    studentCount,
    overdueCount: overdue.length,
    overdue,
    behindOnMap: behind.slice(0, BEHIND_COUNT),
    behindCount: behind.length,
    recentlyUpdated,
  }
}

/**
 * Students behind on their career map, furthest behind first.
 *
 * Students on leave, graduated or withdrawn never appear: the derivation
 * already refuses to call anything overdue for them, and a dashboard that lists
 * a student on leave as behind is telling an advisor to chase someone who is
 * not here.
 */
export async function listStudentsBehindOnMap(): Promise<BehindStudent[]> {
  const [statuses, summaries] = await Promise.all([
    listCareerMapStatuses(),
    listStudents(),
  ])

  return summaries
    .flatMap((student) => {
      const status = statuses.get(student.id)
      if (!status || status.overdueCount === 0) return []
      return [{ student, status }]
    })
    .sort((a, b) => b.status.overdueCount - a.status.overdueCount)
}

/** Students whose most recent note has a follow-up date in the past. */
export async function listOverdueStudents(): Promise<OverdueStudent[]> {
  const [statuses, summaries] = await Promise.all([
    listFollowUpStatuses(),
    listStudents(),
  ])

  return summaries
    .flatMap((student) => {
      const status = statuses.get(student.id)
      if (!status?.overdue || !status.followUpDate) return []

      return [
        {
          student,
          followUpDate: status.followUpDate,
          followUpDateLabel: formatCalendarDate(status.followUpDate),
          daysOverdue: status.daysOverdue,
        },
      ]
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
}
