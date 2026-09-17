import { describe, expect, it } from 'vitest'
import type {
  CareerAction,
  CareerMap,
  CareerTrack,
  StudentRecord,
} from '@/lib/canonical'
import {
  addRequiredSkill,
  applyMapPlacements,
  applyTrackOverlay,
  createCareerAction,
  createCareerTrack,
  deleteCareerAction,
  deleteCareerTrack,
  describeActionUsage,
  describeTrackUsage,
  removeRequiredSkill,
  slugify,
  updateCareerAction,
  updateCareerTrackDetails,
} from './admin'

const action = (
  id: string,
  overrides: Partial<CareerAction> = {},
): CareerAction => ({
  id,
  title: `Do ${id}`,
  why: 'Because.',
  categoryId: 'cat_advising',
  targetCount: 1,
  evidence: null,
  resourceUrl: null,
  ...overrides,
})

const MAP: CareerMap = {
  id: 'map_general',
  version: 1,
  label: 'General',
  description: 'The general map.',
  lastReviewed: '2026-09-16',
  placements: [
    { actionId: 'act_a', term: 'y1-fall' },
    { actionId: 'act_b', term: 'y2-fall' },
  ],
}

const TRACK: CareerTrack = {
  id: 'track_swe',
  label: 'Software engineering',
  description: 'Backend focus.',
  placements: [{ actionId: 'act_c', term: 'y2-fall' }],
  excludes: ['act_b'],
  requiredSkills: [
    {
      id: 'skill_sql',
      name: 'SQL',
      category: 'technical',
      importance: 'essential',
      rationale: null,
    },
  ],
}

const student = (overrides: Partial<StudentRecord> = {}): StudentRecord =>
  ({
    id: 'stu_test',
    careerMap: { trackId: null, trackSetAt: null, progress: [] },
    ...overrides,
  }) as StudentRecord

describe('slugify', () => {
  it('lowercases and underscores a label', () => {
    expect(slugify('act_', 'Meet your advisor', [])).toBe(
      'act_meet_your_advisor',
    )
  })

  it('disambiguates against existing ids', () => {
    expect(
      slugify('act_', 'Meet your advisor', ['act_meet_your_advisor']),
    ).toBe('act_meet_your_advisor_2')
    expect(
      slugify('act_', 'Meet your advisor', [
        'act_meet_your_advisor',
        'act_meet_your_advisor_2',
      ]),
    ).toBe('act_meet_your_advisor_3')
  })

  it('strips punctuation rather than carrying it into the id', () => {
    expect(slugify('act_', 'Build a résumé — draft #1!', [])).toContain('act_')
    expect(slugify('act_', 'Build a résumé — draft #1!', [])).not.toMatch(
      /[^a-z0-9_]/,
    )
  })
})

describe('createCareerAction / updateCareerAction / deleteCareerAction', () => {
  const catalog = [action('act_a')]
  const input = {
    title: 'New action',
    why: 'Reason.',
    categoryId: 'cat_advising',
    targetCount: 1,
    evidence: null,
    resourceUrl: null,
  }

  it('adds a new action with a generated id', () => {
    const next = createCareerAction(catalog, input)
    expect(next).toHaveLength(2)
    expect(next[1]?.id).toBe('act_new_action')
    expect(catalog).toHaveLength(1) // input untouched
  })

  it('updates only the matching action', () => {
    const next = updateCareerAction(catalog, 'act_a', {
      ...input,
      title: 'Renamed',
    })
    expect(next[0]?.title).toBe('Renamed')
    expect(next[0]?.id).toBe('act_a')
  })

  it('deletes only the matching action', () => {
    const next = deleteCareerAction([action('act_a'), action('act_b')], 'act_a')
    expect(next.map((a) => a.id)).toEqual(['act_b'])
  })
})

describe('describeActionUsage', () => {
  it('is null when nothing references the action', () => {
    expect(describeActionUsage('act_unused', MAP, [TRACK], [])).toBeNull()
  })

  it('reports the general map, tracks and students that reference it', () => {
    const students = [
      student({
        careerMap: {
          trackId: null,
          trackSetAt: null,
          progress: [
            {
              actionId: 'act_a',
              status: 'done',
              completedCount: 1,
              movedToTerm: null,
              moveReasonId: null,
              markedBy: 'x',
              markedAt: '2026-01-01T00:00:00.000Z',
              note: null,
            },
          ],
        },
      }),
    ]

    const usage = describeActionUsage('act_a', MAP, [TRACK], students)
    expect(usage).toContain('general map')
    expect(usage).toContain('1 student')
  })

  it('reports a track that only excludes the action', () => {
    expect(describeActionUsage('act_b', MAP, [TRACK], [])).toContain(
      'Software engineering',
    )
  })
})

describe('applyMapPlacements', () => {
  it('replaces placements from a full assignment map', () => {
    const next = applyMapPlacements(
      MAP,
      new Map([
        ['act_a', 'y1-spring'],
        ['act_b', null],
      ]),
    )
    expect(next.placements).toEqual([{ actionId: 'act_a', term: 'y1-spring' }])
    expect(next.version).toBe(2)
  })

  it('does not bump the version when nothing actually changed', () => {
    const next = applyMapPlacements(
      MAP,
      new Map([
        ['act_a', 'y1-fall'],
        ['act_b', 'y2-fall'],
      ]),
    )
    expect(next).toBe(MAP)
    expect(next.version).toBe(1)
  })
})

describe('createCareerTrack / updateCareerTrackDetails / deleteCareerTrack', () => {
  it('creates a track with empty overlays and a generated id', () => {
    const next = createCareerTrack([TRACK], {
      label: 'Security',
      description: 'Cyber focus.',
    })
    const created = next[1]
    expect(created?.id).toBe('track_security')
    expect(created?.placements).toEqual([])
    expect(created?.excludes).toEqual([])
    expect(created?.requiredSkills).toEqual([])
  })

  it('updates label and description without touching overlays', () => {
    const next = updateCareerTrackDetails([TRACK], 'track_swe', {
      label: 'Backend engineering',
      description: 'Updated.',
    })
    expect(next[0]?.label).toBe('Backend engineering')
    expect(next[0]?.placements).toEqual(TRACK.placements)
  })

  it('deletes only the matching track', () => {
    const next = deleteCareerTrack([TRACK], 'track_swe')
    expect(next).toEqual([])
  })
})

describe('describeTrackUsage', () => {
  it('is null when no student is on the track', () => {
    expect(describeTrackUsage('track_swe', [student()])).toBeNull()
  })

  it('counts students currently on the track', () => {
    const students = [
      student({
        careerMap: { trackId: 'track_swe', trackSetAt: null, progress: [] },
      }),
      student({
        careerMap: { trackId: 'track_swe', trackSetAt: null, progress: [] },
      }),
      student({ careerMap: { trackId: null, trackSetAt: null, progress: [] } }),
    ]
    expect(describeTrackUsage('track_swe', students)).toContain('2 student')
  })
})

describe('applyTrackOverlay', () => {
  it('rebuilds placements and excludes from a full override map', () => {
    const next = applyTrackOverlay(
      TRACK,
      new Map<string, 'default' | 'excluded' | string>([
        ['act_a', 'excluded'],
        ['act_b', 'default'], // clears the existing exclude
        ['act_c', 'y3-fall'],
      ]) as never,
    )
    expect(next.excludes).toEqual(['act_a'])
    expect(next.placements).toEqual([{ actionId: 'act_c', term: 'y3-fall' }])
  })
})

describe('addRequiredSkill / removeRequiredSkill', () => {
  it('adds a skill with a generated id', () => {
    const next = addRequiredSkill(TRACK, {
      name: 'Distributed systems',
      category: 'technical',
      importance: 'important',
      rationale: null,
    })
    expect(next.requiredSkills).toHaveLength(2)
    expect(next.requiredSkills[1]?.id).toBe('skill_distributed_systems')
  })

  it('removes only the matching skill', () => {
    const next = removeRequiredSkill(TRACK, 'skill_sql')
    expect(next.requiredSkills).toEqual([])
  })
})
