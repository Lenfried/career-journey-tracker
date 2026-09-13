// milestones — queries

import { formatCalendarDate } from '@/lib/dates'
import { loadLookups, loadStudent } from '@/lib/fixtures'
import { indexLookup } from '@/lib/lookups'
import type { CareerMilestoneView } from './types'

/** A student's milestones, most recently completed first. */
export async function getStudentMilestones(
  studentId: string,
): Promise<CareerMilestoneView[]> {
  const student = loadStudent(studentId)
  if (!student) return []

  const typeLabels = indexLookup(loadLookups().milestoneTypes)

  return student.milestones
    .slice()
    .sort(
      (a, b) =>
        b.completedDate.localeCompare(a.completedDate) ||
        a.id.localeCompare(b.id),
    )
    .map((milestone) => ({
      id: milestone.id,
      typeId: milestone.typeId,
      typeLabel: typeLabels.get(milestone.typeId) ?? milestone.typeId,
      title: milestone.title,
      completedDate: milestone.completedDate,
      completedDateLabel: formatCalendarDate(milestone.completedDate),
      description: milestone.description,
      recordedBy: milestone.recordedBy,
    }))
}
