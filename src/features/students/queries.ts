// students — queries
//
// Service layer. The UI calls these; they call the data source. Nothing above
// this file may import `lib/fixtures`.
//
// Every function here is `async` even though the fixture file is read
// synchronously. That is not ceremony — it is the seam. When the data source
// becomes a Navigate360 ingest or a Postgres query, the bodies become awaited
// and no caller changes.

import {
  CAREER_MAP_TERMS,
  CLASSIFICATIONS,
  displayName,
  sortableName,
  type StudentRecord,
} from '@/lib/canonical'
import { loadLookups, loadStudent, loadStudents } from '@/lib/fixtures'
import { CLASSIFICATION_LABELS, ENROLLMENT_STATUS_LABELS } from '@/lib/labels'
import { resolveLabel } from '@/lib/lookups'
import { formatAcademicTerm, parseAcademicTerm } from '@/lib/terms'
import { listCareerMapStatuses } from '@/features/career-map/queries'
import type {
  SortDirection,
  StudentDetail,
  StudentFilters,
  StudentRosterFilters,
  StudentRosterRow,
  StudentRosterSort,
  StudentSummary,
} from './types'

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

/**
 * The roster screen's richer rows, sorted from URL-backed controls.
 *
 * `listStudents()` remains the small identity summary used by dashboard code.
 * This composition adds career-map status only where the roster needs it and
 * keeps every component away from the fixture data source.
 */
export async function listStudentRoster(
  filters: StudentRosterFilters = {},
): Promise<StudentRosterRow[]> {
  const [students, statuses] = await Promise.all([
    listStudents({ search: filters.search }),
    listCareerMapStatuses(),
  ])
  const records = new Map(
    loadStudents().map((student) => [student.id, student]),
  )

  const rows = students.flatMap((student) => {
    const record = records.get(student.id)
    if (!record) return []
    const status = statuses.get(student.id)

    return [
      {
        ...student,
        entryTerm: record.entryTerm,
        entryTermLabel: formatAcademicTerm(record.entryTerm),
        trackLabel: status?.trackLabel ?? null,
        specializationLabel: status?.specializationLabel ?? null,
        currentCareerTerm: status?.currentTerm ?? null,
        currentCareerTermLabel: status?.currentTermLabel ?? null,
      },
    ]
  })

  return sortRoster(rows, filters.sort ?? 'name', filters.direction ?? 'asc')
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

function sortRoster(
  rows: StudentRosterRow[],
  sort: StudentRosterSort,
  direction: SortDirection,
): StudentRosterRow[] {
  const multiplier = direction === 'asc' ? 1 : -1

  return rows.slice().sort((a, b) => {
    const aMissing = isMissingSortValue(a, sort)
    const bMissing = isMissingSortValue(b, sort)
    if (aMissing !== bMissing) return aMissing ? 1 : -1

    const primary = compareRosterValue(a, b, sort)
    return primary === 0
      ? a.sortableName.localeCompare(b.sortableName)
      : primary * multiplier
  })
}

function isMissingSortValue(
  row: StudentRosterRow,
  sort: StudentRosterSort,
): boolean {
  if (sort === 'track') return row.trackLabel === null
  if (sort === 'specialization') return row.specializationLabel === null
  if (sort === 'career-term') return row.currentCareerTerm === null
  return false
}

function compareRosterValue(
  a: StudentRosterRow,
  b: StudentRosterRow,
  sort: StudentRosterSort,
): number {
  switch (sort) {
    case 'name':
      return a.sortableName.localeCompare(b.sortableName)
    case 'entry-term':
      return academicTermRank(a.entryTerm) - academicTermRank(b.entryTerm)
    case 'classification':
      return (
        CLASSIFICATIONS.indexOf(a.classification) -
        CLASSIFICATIONS.indexOf(b.classification)
      )
    case 'track':
      return compareNullableLabels(a.trackLabel, b.trackLabel)
    case 'specialization':
      return compareNullableLabels(a.specializationLabel, b.specializationLabel)
    case 'career-term':
      return compareNullableRanks(
        a.currentCareerTerm === null
          ? null
          : CAREER_MAP_TERMS.indexOf(a.currentCareerTerm),
        b.currentCareerTerm === null
          ? null
          : CAREER_MAP_TERMS.indexOf(b.currentCareerTerm),
      )
  }
}

function academicTermRank(code: string): number {
  const term = parseAcademicTerm(code)
  if (!term) return Number.MAX_SAFE_INTEGER
  const seasonRank = { SP: 0, SU: 1, FA: 2 }[term.season]
  return term.year * 3 + seasonRank
}

function compareNullableLabels(a: string | null, b: string | null): number {
  if (a === null || b === null) return 0
  return a.localeCompare(b)
}

function compareNullableRanks(a: number | null, b: number | null): number {
  if (a === null || b === null) return 0
  return a - b
}
