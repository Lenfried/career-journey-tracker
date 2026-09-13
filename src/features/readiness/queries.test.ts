import { describe, expect, it } from 'vitest'
import type { LookupItem, ReadinessArtifact } from '@/lib/canonical'
import { deriveReadinessView, getReadinessStatus } from './queries'

const TYPES: LookupItem[] = [
  { id: 'art_resume', label: 'Résumé' },
  { id: 'art_linkedin', label: 'LinkedIn' },
  { id: 'art_github', label: 'GitHub' },
  { id: 'art_portfolio', label: 'Portfolio' },
]

function artifact(
  typeId: string,
  status: ReadinessArtifact['status'],
): ReadinessArtifact {
  return { typeId, status, url: null, advisorNotes: null }
}

describe('deriveReadinessView', () => {
  it('fills in missing artifact types at "none"', () => {
    // A student added last week has no artifact history. The checklist still
    // has to show four rows — a checklist with a different number of items per
    // student is not a checklist.
    const view = deriveReadinessView(TYPES, [
      artifact('art_resume', 'complete'),
    ])

    expect(view.artifacts).toHaveLength(4)
    expect(view.artifacts.map((a) => a.status)).toEqual([
      'complete',
      'none',
      'none',
      'none',
    ])
    expect(view.completeCount).toBe(1)
  })

  it('renders rows in lookup order regardless of record order', () => {
    const view = deriveReadinessView(TYPES, [
      artifact('art_portfolio', 'complete'),
      artifact('art_resume', 'in-progress'),
    ])

    expect(view.artifacts.map((a) => a.typeId)).toEqual(TYPES.map((t) => t.id))
  })

  it('scores an untouched checklist at 0 and a complete one at 100', () => {
    expect(deriveReadinessView(TYPES, []).progressPercent).toBe(0)
    expect(
      deriveReadinessView(
        TYPES,
        TYPES.map((t) => artifact(t.id, 'complete')),
      ).progressPercent,
    ).toBe(100)
  })

  it('gives partial credit for partial progress', () => {
    // needs-review is further along than in-progress, which is further than
    // none. Counting only `complete` would show an advisor no movement for a
    // student who spent the semester moving three artifacts to draft.
    const some = deriveReadinessView(TYPES, [
      artifact('art_resume', 'needs-review'),
      artifact('art_linkedin', 'in-progress'),
    ])

    expect(some.completeCount).toBe(0)
    expect(some.progressPercent).toBeGreaterThan(0)
    expect(some.progressPercent).toBeLessThan(100)
  })

  it('does not divide by zero when there are no artifact types', () => {
    expect(deriveReadinessView([], []).progressPercent).toBe(0)
  })
})

describe('getReadinessStatus', () => {
  it('returns a full checklist for the student with only one artifact row', async () => {
    const view = await getReadinessStatus('stu_kostopoulos_evander')
    expect(view.artifacts).toHaveLength(4)
  })

  it('returns an all-none checklist for an unknown student rather than throwing', async () => {
    const view = await getReadinessStatus('stu_does_not_exist')
    expect(view.artifacts).toHaveLength(4)
    expect(view.progressPercent).toBe(0)
  })
})
