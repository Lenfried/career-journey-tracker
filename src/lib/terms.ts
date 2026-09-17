/**
 * Academic term codes — `2026FA`, `2027SP`, `2027SU`.
 *
 * A term code is a calendar fact about the campus, in the same family as
 * `lib/dates.ts`: it is derived from a day, in `America/New_York`, and never
 * from the reader's clock or zone.
 *
 * The month boundaries below are the campus's, not the registrar's — York's
 * actual term start dates move by a week or two each year, and nothing here
 * needs that precision. If something ever does, this is the one file to change.
 */

import { todayOnCampus } from './dates'

/** Ordered within a calendar year: spring, then summer, then fall. */
export const ACADEMIC_SEASONS = ['SP', 'SU', 'FA'] as const

export type AcademicSeason = (typeof ACADEMIC_SEASONS)[number]

export type AcademicTerm = {
  year: number
  season: AcademicSeason
}

const TERM_CODE = /^(\d{4})(FA|SP|SU)$/

const SEASON_LABELS: Record<AcademicSeason, string> = {
  SP: 'Spring',
  SU: 'Summer',
  FA: 'Fall',
}

/** `"2026FA"` → `{ year: 2026, season: 'FA' }`, or `null` if malformed. */
export function parseAcademicTerm(code: string): AcademicTerm | null {
  const parts = TERM_CODE.exec(code)
  if (!parts) return null

  const [, year, season] = parts
  return { year: Number(year), season: season as AcademicSeason }
}

/** `"2026FA"` → `"Fall 2026"`. Falls back to the code itself. */
export function formatAcademicTerm(code: string): string {
  const term = parseAcademicTerm(code)
  if (!term) return code
  return `${SEASON_LABELS[term.season]} ${term.year}`
}

/**
 * The term a calendar date falls in.
 *
 * Spring runs January through May, summer June and July, fall August through
 * December. August is fall because that is when the recruiting wave the map
 * cares about opens — a student applying to internships in late August is doing
 * fall-term work, whatever the registrar's calendar says.
 */
export function academicTermForDate(date: string = todayOnCampus()): string {
  const [year, month] = date.split('-')
  const monthNumber = Number(month)

  const season: AcademicSeason =
    monthNumber >= 8 ? 'FA' : monthNumber >= 6 ? 'SU' : 'SP'

  return `${year}${season}`
}

/**
 * How many fall and spring terms separate two term codes. Summers do not count
 * — they are not enrollment terms, and nobody becomes a sophomore by living
 * through July.
 *
 * This is what anchors a student to the career map: a student who entered four
 * enrollment terms ago started the map four enrollment terms back from wherever
 * they are now.
 *
 * Negative when `to` is before `from`; 0 when either code is malformed.
 */
export function enrollmentTermsBetween(from: string, to: string): number {
  const start = parseAcademicTerm(from)
  const end = parseAcademicTerm(to)
  if (!start || !end) return 0

  return countEnrollmentTerms(end) - countEnrollmentTerms(start)
}

/** Enrollment terms since year zero. Summer scores with the spring before it. */
function countEnrollmentTerms(term: AcademicTerm): number {
  return term.year * 2 + (term.season === 'FA' ? 1 : 0)
}
