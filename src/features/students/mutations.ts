import type { StudentRecord } from '@/lib/canonical'

export function setStudentPathway(
  student: StudentRecord,
  trackId: string | null,
  specializationId: string | null,
  changedAt: string,
): StudentRecord {
  const trackChanged = student.careerMap.trackId !== trackId
  const specializationChanged =
    student.careerMap.specializationId !== specializationId

  return {
    ...student,
    updatedAt: changedAt,
    careerMap: {
      ...student.careerMap,
      trackId,
      trackSetAt: trackChanged
        ? trackId
          ? changedAt
          : null
        : student.careerMap.trackSetAt,
      specializationId,
      specializationSetAt: specializationChanged
        ? specializationId
          ? changedAt
          : null
        : student.careerMap.specializationSetAt,
    },
  }
}
