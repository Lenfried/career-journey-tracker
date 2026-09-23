import { describe, expect, it } from 'vitest'
import type { StudentRecord } from '@/lib/canonical'
import { setStudentPathway } from './mutations'

const student = {
  updatedAt: '2026-01-01T00:00:00.000Z',
  careerMap: {
    trackId: 'track_old',
    trackSetAt: '2026-01-01T00:00:00.000Z',
    specializationId: 'specialization_old',
    specializationSetAt: '2026-01-01T00:00:00.000Z',
    progress: [],
  },
} as unknown as StudentRecord

describe('setStudentPathway', () => {
  it('timestamps changed selections without resetting progress', () => {
    const changedAt = '2026-09-17T12:00:00.000Z'
    const updated = setStudentPathway(
      student,
      'track_new',
      'specialization_new',
      changedAt,
    )

    expect(updated.careerMap).toMatchObject({
      trackId: 'track_new',
      trackSetAt: changedAt,
      specializationId: 'specialization_new',
      specializationSetAt: changedAt,
      progress: [],
    })
  })

  it('clears assignment timestamps when returning to exploration', () => {
    const updated = setStudentPathway(
      student,
      null,
      null,
      '2026-09-17T12:00:00.000Z',
    )
    expect(updated.careerMap.trackSetAt).toBeNull()
    expect(updated.careerMap.specializationSetAt).toBeNull()
  })
})
