// dashboard — queries
//
// This feature owns no data of its own. It composes the other features'
// service-layer reads, which is why it imports from `features/*` rather than
// from `lib/fixtures` — the dashboard is a consumer of the service layer, not
// a second copy of it.

import { listFollowUpStatuses } from '@/features/notes/queries'
import {
  countStudents,
  listRecentlyUpdatedStudents,
  listStudents,
} from '@/features/students/queries'
import { formatCalendarDate } from '@/lib/dates'
import type { DashboardSummary, OverdueStudent } from './types'

const RECENTLY_UPDATED_COUNT = 5

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [studentCount, recentlyUpdated, overdue] = await Promise.all([
    countStudents(),
    listRecentlyUpdatedStudents(RECENTLY_UPDATED_COUNT),
    listOverdueStudents(),
  ])

  return {
    studentCount,
    overdueCount: overdue.length,
    overdue,
    recentlyUpdated,
  }
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
