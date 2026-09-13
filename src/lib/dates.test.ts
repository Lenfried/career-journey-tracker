import { describe, expect, it } from 'vitest'
import {
  daysBetween,
  describeFollowUp,
  formatCalendarDate,
  formatTimestamp,
  todayOnCampus,
} from './dates'

describe('formatCalendarDate', () => {
  it('does not shift the day', () => {
    // The regression this exists for: `new Date('2026-03-04')` is UTC midnight,
    // which is 2026-03-03 19:00 in America/New_York. Formatted naively, an
    // advising session on the 4th displays as the 3rd.
    expect(formatCalendarDate('2026-03-04')).toBe('Mar 4, 2026')
    expect(formatCalendarDate('2026-01-01')).toBe('Jan 1, 2026')
    expect(formatCalendarDate('2026-12-31')).toBe('Dec 31, 2026')
  })

  it('returns unparseable input unchanged rather than throwing', () => {
    expect(formatCalendarDate('not a date')).toBe('not a date')
  })
})

describe('todayOnCampus', () => {
  it('reports the campus date, not the UTC date', () => {
    // 2026-03-05 02:30 UTC is still 2026-03-04 in New York (UTC-5).
    expect(todayOnCampus(new Date('2026-03-05T02:30:00Z'))).toBe('2026-03-04')
  })

  it('handles the daylight saving offset', () => {
    // After the March transition New York is UTC-4, so 03:30 UTC is still the
    // previous day. Hard-coding an offset would get this wrong twice a year.
    expect(todayOnCampus(new Date('2026-07-05T03:30:00Z'))).toBe('2026-07-04')
    expect(todayOnCampus(new Date('2026-07-05T04:30:00Z'))).toBe('2026-07-05')
  })

  it('produces a string that sorts against canonical calendar dates', () => {
    expect(todayOnCampus(new Date('2026-09-12T16:00:00Z'))).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    )
  })
})

describe('daysBetween', () => {
  it('counts whole days in both directions', () => {
    expect(daysBetween('2026-09-12', '2026-09-15')).toBe(3)
    expect(daysBetween('2026-09-15', '2026-09-12')).toBe(-3)
    expect(daysBetween('2026-09-12', '2026-09-12')).toBe(0)
  })

  it('counts across a daylight saving transition', () => {
    // 2026-03-08 is the US spring-forward date. A naive millisecond division
    // returns 0.958 days here and rounds to the wrong answer if truncated.
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
  })
})

describe('describeFollowUp', () => {
  const today = '2026-09-12'

  it('describes overdue, due today, and upcoming', () => {
    expect(describeFollowUp('2026-09-09', today)).toBe('3 days overdue')
    expect(describeFollowUp('2026-09-12', today)).toBe('due today')
    expect(describeFollowUp('2026-09-17', today)).toBe('due in 5 days')
  })

  it('uses the singular for one day', () => {
    expect(describeFollowUp('2026-09-11', today)).toBe('1 day overdue')
    expect(describeFollowUp('2026-09-13', today)).toBe('due in 1 day')
  })
})

describe('formatTimestamp', () => {
  it('renders in campus time', () => {
    // 18:20 UTC in September is 14:20 in New York (UTC-4).
    expect(formatTimestamp('2026-09-11T18:20:00.000Z')).toBe(
      'Sep 11, 2026, 2:20 PM',
    )
  })
})
