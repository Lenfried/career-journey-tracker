import { describe, expect, it } from 'vitest'
import { academicTermForDate, formatAcademicTerm, parseAcademicTerm } from './terms'

describe('parseAcademicTerm', () => {
  it('reads a term code', () => {
    expect(parseAcademicTerm('2026FA')).toEqual({ year: 2026, season: 'FA' })
  })

  it('returns null for anything else', () => {
    for (const bad of ['2026', 'FA2026', '2026WI', '', 'nonsense']) {
      expect(parseAcademicTerm(bad)).toBeNull()
    }
  })
})

describe('formatAcademicTerm', () => {
  it('formats each season', () => {
    expect(formatAcademicTerm('2026FA')).toBe('Fall 2026')
    expect(formatAcademicTerm('2027SP')).toBe('Spring 2027')
    expect(formatAcademicTerm('2027SU')).toBe('Summer 2027')
  })

  it('falls back to the code rather than throwing', () => {
    expect(formatAcademicTerm('nope')).toBe('nope')
  })
})

describe('academicTermForDate', () => {
  it('splits the year into spring, summer and fall', () => {
    expect(academicTermForDate('2026-01-15')).toBe('2026SP')
    expect(academicTermForDate('2026-05-31')).toBe('2026SP')
    expect(academicTermForDate('2026-06-01')).toBe('2026SU')
    expect(academicTermForDate('2026-07-31')).toBe('2026SU')
    expect(academicTermForDate('2026-12-31')).toBe('2026FA')
  })

  it('counts August as fall', () => {
    // The internship and new-grad wave opens in August. A student applying then
    // is doing fall-term work whatever the registrar's calendar says.
    expect(academicTermForDate('2026-08-01')).toBe('2026FA')
  })
})
