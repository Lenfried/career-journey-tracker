import { describe, expect, it } from 'vitest'
import type {
  CareerAction,
  CareerActionProgress,
  CareerMap,
  CareerSpecialization,
  CareerTrack,
} from '@/lib/canonical'
import {
  collectEvidence,
  deriveCareerMapView,
  deriveMapPosition,
  getCareerMap,
  getCareerMapStatus,
  listCareerMapStatuses,
  mergePlacements,
  type EvidenceSummary,
} from './queries'

/* -------------------------------------------------------------------------- */
/* Test data                                                                   */
/* -------------------------------------------------------------------------- */

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

const CATALOG: CareerAction[] = [
  action('act_a'),
  action('act_b'),
  action('act_c'),
  action('act_track_only'),
  action('act_countable', { targetCount: 2 }),
]

const MAP: CareerMap = {
  id: 'map_general',
  version: 1,
  label: 'General',
  description: 'The general map.',
  lastReviewed: '2026-09-16',
  placements: [
    { actionId: 'act_a', term: 'y1-fall' },
    { actionId: 'act_b', term: 'y2-fall' },
    { actionId: 'act_c', term: 'y3-spring' },
    { actionId: 'act_countable', term: 'y1-fall' },
  ],
}

const TRACK: CareerTrack = {
  id: 'track_example',
  label: 'Example track',
  description: 'A broad career family.',
}

const SPECIALIZATION: CareerSpecialization = {
  id: 'specialization_example',
  trackId: TRACK.id,
  label: 'Example specialization',
  description: 'Adds one, moves one, drops one.',
  placements: [
    { actionId: 'act_track_only', term: 'y2-summer' },
    { actionId: 'act_c', term: 'y2-fall' },
  ],
  excludes: ['act_b'],
  requiredSkills: [],
}

const progress = (
  actionId: string,
  overrides: Partial<CareerActionProgress> = {},
): CareerActionProgress => ({
  actionId,
  status: 'done',
  completedCount: 1,
  movedToTerm: null,
  moveReasonId: null,
  markedBy: 'Dr. Helena Vance',
  markedAt: '2026-02-10T15:00:00.000Z',
  note: null,
  ...overrides,
})

const view = ({
  track = null,
  specialization = null,
  progress: rows = [],
  evidence = new Map<string, EvidenceSummary>(),
  entryTerm = '2024FA',
  classification = 'junior' as const,
  enrollmentStatus = 'enrolled' as const,
  today = '2026-09-16',
}: {
  track?: CareerTrack | null
  specialization?: CareerSpecialization | null
  progress?: CareerActionProgress[]
  evidence?: Map<string, EvidenceSummary>
  /** Four enrollment terms before the default "today", so a junior starts at y1. */
  entryTerm?: string
  classification?: 'freshman' | 'sophomore' | 'junior' | 'senior'
  enrollmentStatus?: 'enrolled' | 'leave-of-absence' | 'graduated' | 'withdrawn'
  today?: string
} = {}) =>
  deriveCareerMapView({
    map: MAP,
    track,
    specialization,
    tracks: [TRACK],
    specializations: [SPECIALIZATION],
    catalog: CATALOG,
    assignment: {
      trackId: track?.id ?? null,
      trackSetAt: null,
      specializationId: specialization?.id ?? null,
      specializationSetAt: null,
      progress: rows,
    },
    evidence,
    categoryLabels: new Map([['cat_advising', 'Advising']]),
    moveReasonLabels: new Map([['move_transfer', 'Transferred in']]),
    position: deriveMapPosition(
      { classification, enrollmentStatus, entryTerm },
      today,
    ),
  })

const find = (result: ReturnType<typeof view>, actionId: string) =>
  result.terms
    .flatMap((term) => term.actions)
    .find((a) => a.actionId === actionId)

/* -------------------------------------------------------------------------- */

describe('deriveMapPosition', () => {
  it('reads the year from classification and the season from the date', () => {
    expect(
      deriveMapPosition(
        {
          classification: 'freshman',
          enrollmentStatus: 'enrolled',
          entryTerm: '2024FA',
        },
        '2026-09-16',
      ).currentTerm,
    ).toBe('y1-fall')

    expect(
      deriveMapPosition(
        {
          classification: 'junior',
          enrollmentStatus: 'enrolled',
          entryTerm: '2024FA',
        },
        '2027-02-03',
      ).currentTerm,
    ).toBe('y3-spring')

    expect(
      deriveMapPosition(
        {
          classification: 'sophomore',
          enrollmentStatus: 'enrolled',
          entryTerm: '2024FA',
        },
        '2026-07-04',
      ).currentTerm,
    ).toBe('y2-summer')
  })

  it('treats August as fall, when the recruiting wave opens', () => {
    const position = deriveMapPosition(
      {
        classification: 'junior',
        enrollmentStatus: 'enrolled',
        entryTerm: '2024FA',
      },
      '2026-08-04',
    )
    expect(position.currentTerm).toBe('y3-fall')
    expect(position.academicTerm).toBe('2026FA')
    expect(position.academicTermLabel).toBe('Fall 2026')
  })

  it('has no term for the summer after senior year', () => {
    const position = deriveMapPosition(
      {
        classification: 'senior',
        enrollmentStatus: 'enrolled',
        entryTerm: '2024FA',
      },
      '2027-07-01',
    )
    expect(position.currentTerm).toBeNull()
    expect(position.timelineIndex).toBe(11)
  })

  it('pauses a student on leave rather than placing them in a term', () => {
    const position = deriveMapPosition(
      {
        classification: 'sophomore',
        enrollmentStatus: 'leave-of-absence',
        entryTerm: '2024FA',
      },
      '2026-09-16',
    )
    expect(position.state).toBe('paused')
    expect(position.currentTerm).toBeNull()
    // The timeline still shows where they were — it just stops nagging.
    expect(position.timelineIndex).toBe(3)
  })

  it('ends the map for a graduated or withdrawn student', () => {
    for (const status of ['graduated', 'withdrawn'] as const) {
      const position = deriveMapPosition(
        {
          classification: 'senior',
          enrollmentStatus: status,
          entryTerm: '2024FA',
        },
        '2026-09-16',
      )
      expect(position.state).toBe('ended')
      expect(position.timelineIndex).toBe(11)
    }
  })
})

describe('mergePlacements', () => {
  it('returns the general map untouched when there is no specialization', () => {
    expect(mergePlacements(MAP, null)).toHaveLength(MAP.placements.length)
    expect(mergePlacements(MAP, null).every((p) => !p.fromSpecialization)).toBe(
      true,
    )
  })

  it('adds, excludes and moves', () => {
    const merged = mergePlacements(MAP, SPECIALIZATION)
    const byId = new Map(merged.map((p) => [p.actionId, p]))

    expect(byId.get('act_track_only')?.term).toBe('y2-summer')
    expect(byId.has('act_b')).toBe(false)
    // Moved, not duplicated: one row, in the track's term.
    expect(merged.filter((p) => p.actionId === 'act_c')).toHaveLength(1)
    expect(byId.get('act_c')?.term).toBe('y2-fall')
    expect(byId.get('act_c')?.fromSpecialization).toBe(true)
    expect(byId.get('act_a')?.fromSpecialization).toBe(false)
  })
})

describe('collectEvidence', () => {
  const catalog = [
    action('act_fair', { evidence: { kind: 'milestone', typeId: 'ms_fair' } }),
    action('act_linkedin', {
      evidence: { kind: 'artifact', typeId: 'art_linkedin' },
    }),
    action('act_meeting', { evidence: { kind: 'note', typeId: 'note_check' } }),
    action('act_none'),
  ]

  const lookups = {
    milestoneTypes: [{ id: 'ms_fair', label: 'Career fair' }],
    noteTypes: [{ id: 'note_check', label: 'Check-in' }],
    artifactTypes: [{ id: 'art_linkedin', label: 'LinkedIn' }],
  }

  const student = {
    milestones: [
      { typeId: 'ms_fair' },
      { typeId: 'ms_fair' },
      { typeId: 'ms_other' },
    ],
    notes: [{ typeId: 'note_check' }],
    artifacts: [{ typeId: 'art_linkedin', status: 'in-progress' as const }],
  }

  it('counts milestones and notes of the matching type', () => {
    const evidence = collectEvidence(
      student as never,
      catalog,
      lookups as never,
    )
    expect(evidence.get('act_fair')).toEqual({
      kind: 'milestone',
      count: 2,
      label: 'Career fair',
    })
    expect(evidence.get('act_meeting')?.count).toBe(1)
  })

  it('counts an artifact only when it is complete', () => {
    const evidence = collectEvidence(
      student as never,
      catalog,
      lookups as never,
    )
    expect(evidence.get('act_linkedin')?.count).toBe(0)

    const done = collectEvidence(
      {
        ...student,
        artifacts: [{ typeId: 'art_linkedin', status: 'complete' as const }],
      } as never,
      catalog,
      lookups as never,
    )
    expect(done.get('act_linkedin')?.count).toBe(1)
  })

  it('ignores actions with no evidence source', () => {
    const evidence = collectEvidence(
      student as never,
      catalog,
      lookups as never,
    )
    expect(evidence.has('act_none')).toBe(false)
  })
})

describe('deriveCareerMapView', () => {
  it('fills untouched actions in at not-started', () => {
    const result = view()
    expect(find(result, 'act_a')?.status).toBe('not-started')
    expect(find(result, 'act_a')?.markedBy).toBeNull()
  })

  it('renders every term, including the empty ones', () => {
    expect(view().terms).toHaveLength(11)
  })

  it('leaves waived actions out of both halves of the percentage', () => {
    const result = view({
      progress: [
        progress('act_a'),
        progress('act_b', { status: 'not-applicable', completedCount: 0 }),
        progress('act_c', { status: 'not-applicable', completedCount: 0 }),
      ],
    })

    // One done out of two that still apply — not one out of four.
    expect(result.applicableCount).toBe(2)
    expect(result.doneCount).toBe(1)
    expect(result.progressPercent).toBe(50)
  })

  it('marks past-term unfinished actions overdue, and nothing else', () => {
    const result = view({ classification: 'junior', today: '2026-09-16' })

    expect(find(result, 'act_a')?.overdue).toBe(true) // y1-fall, behind
    expect(find(result, 'act_c')?.overdue).toBe(false) // y3-spring, ahead
  })

  it('never marks anything overdue for a paused or ended student', () => {
    for (const status of [
      'leave-of-absence',
      'graduated',
      'withdrawn',
    ] as const) {
      const result = view({
        classification: 'senior',
        enrollmentStatus: status,
      })
      expect(result.overdueActions).toHaveLength(0)
    }
  })

  it('surfaces the current term’s unfinished actions as the focus list', () => {
    const result = view({
      classification: 'freshman',
      today: '2026-09-16',
      progress: [progress('act_a')],
    })

    expect(result.position.currentTerm).toBe('y1-fall')
    // act_a is done, act_countable is not.
    expect(result.focusActions.map((a) => a.actionId)).toEqual([
      'act_countable',
    ])
  })

  it('keeps work done under a previous specialization', () => {
    const result = view({
      track: TRACK,
      specialization: SPECIALIZATION,
      progress: [progress('act_b', { note: 'Did this before switching.' })],
    })

    // act_b is excluded by the specialization, so it is not on the timeline...
    expect(find(result, 'act_b')).toBeUndefined()
    // ...but the work is not lost.
    expect(result.previousSpecializationWork).toEqual([
      {
        actionId: 'act_b',
        title: 'Do act_b',
        status: 'done',
        statusLabel: 'Done',
        markedAtLabel: expect.any(String),
        note: 'Did this before switching.',
      },
    ])
  })

  it('carries progress across a specialization change rather than resetting it', () => {
    const rows = [progress('act_c')]

    // Same action, same id, different term on the track.
    const general = view({ progress: rows })
    const specialized = view({
      track: TRACK,
      specialization: SPECIALIZATION,
      progress: rows,
    })

    expect(find(general, 'act_c')?.term).toBe('y3-spring')
    expect(find(specialized, 'act_c')?.term).toBe('y2-fall')
    expect(find(general, 'act_c')?.status).toBe('done')
    expect(find(specialized, 'act_c')?.status).toBe('done')
  })

  it('shows an evidence hint until the action is settled', () => {
    const evidence = new Map<string, EvidenceSummary>([
      ['act_a', { kind: 'milestone', count: 2, label: 'Career fair' }],
    ])

    expect(find(view({ evidence }), 'act_a')?.evidenceHint).toBe(
      '2 career fair milestones on file',
    )
    // Confirmed actions need no hint.
    expect(
      find(view({ evidence, progress: [progress('act_a')] }), 'act_a')
        ?.evidenceHint,
    ).toBeNull()
  })

  it('reports countable progress against the target', () => {
    const result = view({
      progress: [
        progress('act_countable', { status: 'in-progress', completedCount: 1 }),
      ],
    })
    const countable = find(result, 'act_countable')
    expect(countable?.completedCount).toBe(1)
    expect(countable?.targetCount).toBe(2)
  })
})

describe('getCareerMap', () => {
  it('puts a student with nothing recorded on the map all the same', async () => {
    // Tobias is the "nothing started" fixture student. Everyone is on the map;
    // a freshman two weeks in simply has not done any of it yet.
    const result = await getCareerMap('stu_lindqvist_tobias')

    expect(result?.terms).toHaveLength(11)
    expect(result?.doneCount).toBe(0)
    expect(
      result?.terms
        .flatMap((term) => term.actions)
        .every((action) => action.status === 'not-started'),
    ).toBe(true)
  })

  it('returns null for an unknown student rather than throwing', async () => {
    expect(await getCareerMap('stu_does_not_exist')).toBeNull()
  })

  it('resolves a real student against the real template', async () => {
    const result = await getCareerMap('stu_okonkwo_amara')

    expect(result?.trackId).toBe('track_software_engineering')
    expect(result?.specializationId).toBe('specialization_backend_engineering')
    expect(result?.terms).toHaveLength(11)
    expect(result?.doneCount).toBeGreaterThan(0)
    // She looked at research before settling on backend; that row is kept.
    expect(
      result?.previousSpecializationWork.map((work) => work.actionId),
    ).toContain('act_lab_email')
  })

  it('keeps direct student identifiers out of the view model', async () => {
    const result = await getCareerMap('stu_okonkwo_amara')
    const serialised = JSON.stringify(result)

    expect(serialised).not.toContain('Amara')
    expect(serialised).not.toContain('Okonkwo')
    expect(serialised).not.toContain('99000001')
    expect(serialised).not.toContain('@demo.invalid')
  })
})

describe('a student who joined the map late', () => {
  // A transfer arriving as a junior was never asked to do the Year 1 actions.
  const transfer = () =>
    // A junior in their first term here: nothing before Year 3 was ever theirs.
    view({ entryTerm: '2026FA', classification: 'junior' })

  it('never shows them as overdue', () => {
    expect(transfer().overdueActions).toHaveLength(0)
    expect(find(transfer(), 'act_a')?.beforeStart).toBe(true)
  })

  it('leaves them out of the percentage entirely', () => {
    const result = transfer()
    // act_a, act_countable (y1-fall) and act_b (y2-fall) all predate the start.
    expect(result.applicableCount).toBe(1)
    expect(
      result.terms.find((t) => t.term === 'y1-fall')?.applicableCount,
    ).toBe(0)
  })

  it('still counts what they did do in those terms', () => {
    // A transfer who does the Year 1 advising intake in their first term here
    // has done it. Only untouched actions drop out.
    const result = view({
      entryTerm: '2026FA',
      classification: 'junior',
      progress: [progress('act_a')],
    })

    expect(find(result, 'act_a')?.beforeStart).toBe(false)
    expect(result.doneCount).toBe(1)
    expect(result.applicableCount).toBe(2)
    const firstTerm = result.terms.find((t) => t.term === 'y1-fall')
    // Reads as 1 of 1, not 1 of 0.
    expect(firstTerm?.doneCount).toBe(1)
    expect(firstTerm?.applicableCount).toBe(1)
  })

  it('still renders the earlier terms, marked as before they joined', () => {
    const before = transfer().terms.filter((term) => term.beforeStart)
    expect(before.map((term) => term.term)).toEqual([
      'y1-fall',
      'y1-spring',
      'y1-summer',
      'y2-fall',
      'y2-spring',
      'y2-summer',
    ])
  })
})

describe('an action an advisor moved', () => {
  const moved = (overrides = {}) =>
    view({
      entryTerm: '2026FA',
      classification: 'junior',
      progress: [
        progress('act_a', {
          status: 'not-started',
          completedCount: 0,
          movedToTerm: 'y3-fall',
          moveReasonId: 'move_transfer',
          note: 'Arrived as a junior; still worth doing.',
        }),
      ],
      ...overrides,
    })

  it('sits in the term the advisor moved it to, not the template\u2019s', () => {
    const action = find(moved(), 'act_a')
    expect(action?.term).toBe('y3-fall')
    expect(action?.templateTerm).toBe('y1-fall')
    expect(action?.movedFromTermLabel).toBe('Year 1 \u00b7 Fall')
    expect(action?.carriedOver).toBe(true)
    expect(action?.moveReasonLabel).toBe('Transferred in')
  })

  it('counts again once it has been pulled forward', () => {
    // Carried out of a before-start term into a live one: back in the
    // denominator, and back on the list of things to do.
    const result = moved()
    expect(find(result, 'act_a')?.beforeStart).toBe(false)
    expect(result.applicableCount).toBe(2)
    expect(result.focusActions.map((a) => a.actionId)).toContain('act_a')
    expect(result.carriedActions.map((a) => a.actionId)).toEqual(['act_a'])
  })

  it('sorts ahead of whatever the template put in that term', () => {
    const result = view({
      classification: 'junior',
      progress: [
        progress('act_a', {
          status: 'not-started',
          completedCount: 0,
          movedToTerm: 'y3-spring',
          moveReasonId: 'move_workload',
        }),
      ],
    })

    const term = result.terms.find((t) => t.term === 'y3-spring')
    // act_c is the template's own y3-spring action; the moved one comes first.
    expect(term?.actions.map((a) => a.actionId)).toEqual(['act_a', 'act_c'])
  })

  it('falls back to the reason id when the lookup row is gone', () => {
    const action = find(moved(), 'act_a')
    expect(action?.moveReasonLabel).toBe('Transferred in')

    const unknown = view({
      progress: [
        progress('act_a', {
          movedToTerm: 'y4-fall',
          moveReasonId: 'move_retired',
        }),
      ],
    })
    // Ugly, legible, reportable — the same call `resolveLabel` makes.
    expect(find(unknown, 'act_a')?.moveReasonLabel).toBe('move_retired')
  })
})

describe('listCareerMapStatuses', () => {
  it('has an entry for every student', async () => {
    const statuses = await listCareerMapStatuses()

    expect(statuses.size).toBeGreaterThanOrEqual(15)
    // On the map like everyone else, with nothing done and nothing yet late.
    expect(statuses.get('stu_lindqvist_tobias')).toMatchObject({
      state: 'active',
      doneCount: 0,
      overdueCount: 0,
    })
  })

  it('agrees with the full view for the same student', async () => {
    // Two callers, one derivation. If these ever disagree, the summary line on
    // the dashboard is quietly lying about the page it links to.
    const [statuses, view] = await Promise.all([
      listCareerMapStatuses(),
      getCareerMap('stu_okonkwo_amara'),
    ])
    const status = statuses.get('stu_okonkwo_amara')

    expect(status?.doneCount).toBe(view?.doneCount)
    expect(status?.applicableCount).toBe(view?.applicableCount)
    expect(status?.overdueCount).toBe(view?.overdueActions.length)
    expect(status?.trackLabel).toBe(view?.trackLabel)
  })
})

describe('getCareerMapStatus', () => {
  it('reports an unknown student rather than throwing', async () => {
    expect(await getCareerMapStatus('stu_does_not_exist')).toMatchObject({
      state: 'none',
      overdueCount: 0,
    })
  })
})

describe('where a student\u2019s own timeline starts', () => {
  const start = (
    classification: 'freshman' | 'sophomore' | 'junior' | 'senior',
    entryTerm: string,
  ) =>
    deriveMapPosition(
      { classification, enrollmentStatus: 'enrolled', entryTerm },
      '2026-09-16',
    ).startedTerm

  it('puts anyone who began here at the start of the map', () => {
    expect(start('freshman', '2026FA')).toBe('y1-fall')
    expect(start('sophomore', '2025FA')).toBe('y1-fall')
    expect(start('junior', '2024FA')).toBe('y1-fall')
    expect(start('senior', '2023FA')).toBe('y1-fall')
  })

  it('starts a transfer where they actually arrived', () => {
    // A junior in their first term here has no Year 1 or Year 2 to answer for.
    expect(start('junior', '2026FA')).toBe('y3-fall')
    expect(start('senior', '2025FA')).toBe('y3-fall')
  })

  it('never lands on a summer, because nobody enrolls into one', () => {
    for (const entry of ['2023FA', '2024SP', '2025SU', '2026FA']) {
      expect(start('senior', entry)).not.toContain('summer')
    }
  })

  it('is the same map either way — only the calendar moves', () => {
    // A freshman's Year 1 and a senior's Year 1 are the same row of the same
    // plan, three years apart.
    const freshman = deriveMapPosition(
      {
        classification: 'freshman',
        enrollmentStatus: 'enrolled',
        entryTerm: '2026FA',
      },
      '2026-09-16',
    )
    const senior = deriveMapPosition(
      {
        classification: 'senior',
        enrollmentStatus: 'enrolled',
        entryTerm: '2023FA',
      },
      '2026-09-16',
    )

    expect(freshman.startedTerm).toBe(senior.startedTerm)
    expect(freshman.currentTerm).toBe('y1-fall')
    expect(senior.currentTerm).toBe('y4-fall')
  })
})
