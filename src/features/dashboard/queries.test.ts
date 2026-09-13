import { describe, expect, it } from 'vitest'
import { getDashboardSummary, listOverdueStudents } from './queries'

describe('getDashboardSummary', () => {
  it('counts every student', async () => {
    const summary = await getDashboardSummary()
    expect(summary.studentCount).toBeGreaterThanOrEqual(15)
  })

  it('reports a recently updated list, newest first', async () => {
    const { recentlyUpdated } = await getDashboardSummary()

    expect(recentlyUpdated.length).toBeLessThanOrEqual(5)
    expect(recentlyUpdated.map((s) => s.updatedAt)).toEqual(
      [...recentlyUpdated.map((s) => s.updatedAt)].sort().reverse(),
    )
  })

  it('agrees with the overdue list it summarises', async () => {
    const summary = await getDashboardSummary()
    expect(summary.overdueCount).toBe(summary.overdue.length)
  })
})

describe('listOverdueStudents', () => {
  it('orders by how overdue, most overdue first', async () => {
    const overdue = await listOverdueStudents()
    const days = overdue.map((o) => o.daysOverdue)

    expect(days).toEqual([...days].sort((a, b) => b - a))
  })

  it('only includes students that really are past due', async () => {
    // These tests run against a fixture set with fixed dates and a moving
    // "today", so the count is not assertable — but the invariant is.
    for (const entry of await listOverdueStudents()) {
      expect(entry.daysOverdue).toBeGreaterThan(0)
      expect(entry.followUpDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})
