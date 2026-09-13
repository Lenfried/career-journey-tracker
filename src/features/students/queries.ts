// students — queries
//
// Service layer. The UI calls these; they call the data source. Nothing above
// this file may import `lib/fixtures`.
//
// Every function here is `async` even though the fixture file is read
// synchronously. That is not ceremony — it is the seam. When the data source
// becomes a Navigate360 ingest or a Postgres query, the bodies become awaited
// and no caller changes.

import { displayName, sortableName, type StudentRecord } from '@/lib/canonical'
import { loadLookups, loadStudent, loadStudents } from '@/lib/fixtures'
import { CLASSIFICATION_LABELS, ENROLLMENT_STATUS_LABELS } from '@/lib/labels'
import { resolveLabel } from '@/lib/lookups'
import type { StudentDetail, StudentFilters, StudentSummary } from './types'

/**
 * The roster, ordered by surname.
 *
 * `search` matches display name, legal name, or EMPLID. Legal name is included
 * because an advisor arriving from a CUNYFirst screen has the legal name in
 * front of them; EMPLID because that is what is on the paperwork.
 */
export async function listStudents(
  filters: StudentFilters = {},
): Promise<StudentSummary[]> {
  const lookups = loadLookups()
  const needle = filters.search?.trim().toLowerCase()

  return loadStudents()
    .filter((student) => (needle ? matchesSearch(student, needle) : true))
    .map((student) => toSummary(student, lookups.programs))
    .sort((a, b) => a.sortableName.localeCompare(b.sortableName))
}

/** One student, or `null` when the id is unknown — callers render a 404. */
export async function getStudent(id: string): Promise<StudentDetail | null> {
  const student = loadStudent(id)
  if (!student) return null

  const lookups = loadLookups()

  return {
    ...toSummary(student, lookups.programs),
    firstName: student.firstName,
    lastName: student.lastName,
    preferredName: student.preferredName,
    email: student.email,
    bio: student.bio,
    noteCount: student.notes.length,
    milestoneCount: student.milestones.length,
  }
}

/** Total enrolled-or-otherwise student count, for the dashboard. */
export async function countStudents(): Promise<number> {
  return loadStudents().length
}

/**
 * Most recently updated students first.
 *
 * `updatedAt` is an ISO-8601 instant, which sorts correctly as a string —
 * parsing to Date to compare would be the same answer, slower.
 */
export async function listRecentlyUpdatedStudents(
  take = 5,
): Promise<StudentSummary[]> {
  const programs = loadLookups().programs

  return loadStudents()
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, take)
    .map((student) => toSummary(student, programs))
}

/* -------------------------------------------------------------------------- */

function matchesSearch(student: StudentRecord, needle: string): boolean {
  const haystack = [
    displayName(student),
    `${student.firstName} ${student.lastName}`,
    student.emplid,
  ]
  return haystack.some((value) => value.toLowerCase().includes(needle))
}

function toSummary(
  student: StudentRecord,
  programs: ReturnType<typeof loadLookups>['programs'],
): StudentSummary {
  return {
    id: student.id,
    emplid: student.emplid,
    displayName: displayName(student),
    sortableName: sortableName(student),
    programLabel: resolveLabel(programs, student.programId),
    classification: student.classification,
    classificationLabel: CLASSIFICATION_LABELS[student.classification],
    enrollmentStatus: student.enrollmentStatus,
    enrollmentStatusLabel: ENROLLMENT_STATUS_LABELS[student.enrollmentStatus],
    advisor: student.advisor,
    updatedAt: student.updatedAt,
  }
}
