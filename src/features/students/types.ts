// students — types
//
// View models. These are what the UI receives; they are deliberately not the
// canonical record. Labels are already resolved and the preferred-name rule is
// already applied, so no component has to remember either.

import type {
  CareerMapTerm,
  Classification,
  EnrollmentStatus,
  StudentRecord,
} from '@/lib/canonical'

/** A roster row. */
export type StudentSummary = {
  id: string
  emplid: string
  /** Preferred name if set, legal first name otherwise. Never both. */
  displayName: string
  /** "Okonkwo, Amara" — for surname-ordered tables. */
  sortableName: string
  programLabel: string
  classification: Classification
  classificationLabel: string
  enrollmentStatus: EnrollmentStatus
  enrollmentStatusLabel: string
  advisor: string | null
  updatedAt: string
}

export const STUDENT_ROSTER_SORTS = [
  'name',
  'entry-term',
  'classification',
  'track',
  'specialization',
  'career-term',
] as const

export type StudentRosterSort = (typeof STUDENT_ROSTER_SORTS)[number]
export type SortDirection = 'asc' | 'desc'

/** A roster row enriched with the student's structured career-map taxonomy. */
export type StudentRosterRow = StudentSummary & {
  entryTerm: string
  entryTermLabel: string
  trackLabel: string | null
  specializationLabel: string | null
  currentCareerTerm: CareerMapTerm | null
  currentCareerTermLabel: string | null
}

/** The profile header, plus the counts shown on the overview tab. */
export type StudentDetail = StudentSummary & {
  firstName: string
  lastName: string
  /** `null` when the student has not given one. */
  preferredName: string | null
  email: string
  bio: string | null
  noteCount: number
  milestoneCount: number
}

/** What `listStudents()` accepts. Widens as the roster grows filters. */
export type StudentFilters = {
  /** Matches display name, legal name, or EMPLID. Case-insensitive. */
  search?: string
}

export type StudentRosterFilters = StudentFilters & {
  sort?: StudentRosterSort
  direction?: SortDirection
}

/** Narrow alias for the identity fields the name helpers need. */
export type NameFields = Pick<
  StudentRecord,
  'firstName' | 'lastName' | 'preferredName'
>
