/**
 * Date handling for the two kinds of date in the canonical schema.
 *
 * Calendar dates (`YYYY-MM-DD`) are days, not instants. `new Date('2026-03-04')`
 * parses as UTC midnight, which is 2026-03-03 19:00 in America/New_York — format
 * that and the advising session moves to the previous day. Everything here
 * either avoids `Date` entirely or pins the zone explicitly.
 */

export const CAMPUS_TIME_ZONE = 'America/New_York'

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

const calendarDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const timestampFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CAMPUS_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const nyCalendarFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAMPUS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Today as a `YYYY-MM-DD` calendar date on campus. Comparing this against a
 * `followUpDate` with `<` is correct because ISO calendar dates sort
 * lexicographically.
 *
 * `now` is injectable so tests can pin a date instead of drifting with the clock.
 */
export function todayOnCampus(now: Date = new Date()): string {
  // en-CA renders as YYYY-MM-DD, which is exactly the canonical shape.
  return nyCalendarFormatter.format(now)
}

/** "Mar 4, 2026". Zone-safe: never constructs a local-time Date. */
export function formatCalendarDate(date: string): string {
  const parts = CALENDAR_DATE.exec(date)
  if (!parts) return date

  const [, year, month, day] = parts
  const asUtc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return calendarDateFormatter.format(asUtc)
}

/** "Mar 4, 2026, 2:15 PM" in America/New_York. */
export function formatTimestamp(iso: string): string {
  const instant = new Date(iso)
  if (Number.isNaN(instant.getTime())) return iso
  return timestampFormatter.format(instant)
}

/** Whole days between two calendar dates. Negative when `to` is before `from`. */
export function daysBetween(from: string, to: string): number {
  const start = calendarDateToUtcMs(from)
  const end = calendarDateToUtcMs(to)
  if (start === null || end === null) return 0
  return Math.round((end - start) / 86_400_000)
}

/** "3 days overdue", "due today", "due in 5 days". */
export function describeFollowUp(followUpDate: string, today: string): string {
  const days = daysBetween(today, followUpDate)
  if (days === 0) return 'due today'
  if (days < 0) {
    const overdue = Math.abs(days)
    return `${overdue} ${overdue === 1 ? 'day' : 'days'} overdue`
  }
  return `due in ${days} ${days === 1 ? 'day' : 'days'}`
}

function calendarDateToUtcMs(date: string): number | null {
  const parts = CALENDAR_DATE.exec(date)
  if (!parts) return null
  const [, year, month, day] = parts
  return Date.UTC(Number(year), Number(month) - 1, Number(day))
}
