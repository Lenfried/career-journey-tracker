import { describe, expect, it } from 'vitest'
import type { CareerAction, LookupItem } from '@/lib/canonical'
import { groupActionsByCategory } from './action-groups'

const categories: LookupItem[] = [
  { id: 'cat_advising', label: 'Advising' },
  { id: 'cat_experience', label: 'Experience' },
]

const action = (id: string, categoryId: string): CareerAction => ({
  id,
  title: id,
  why: 'Test action.',
  categoryId,
  targetCount: 1,
  evidence: null,
  resourceUrl: null,
})

describe('groupActionsByCategory', () => {
  it('uses configured category order and omits empty groups', () => {
    const groups = groupActionsByCategory(
      [
        action('act_experience', 'cat_experience'),
        action('act_advising', 'cat_advising'),
      ],
      categories,
    )

    expect(groups.map((group) => group.label)).toEqual([
      'Advising',
      'Experience',
    ])
    expect(groups[0]?.actions.map((item) => item.id)).toEqual(['act_advising'])
  })

  it('keeps actions with an unknown category in a fallback group', () => {
    const groups = groupActionsByCategory(
      [action('act_legacy', 'cat_retired')],
      categories,
    )

    expect(groups).toEqual([
      {
        id: 'uncategorized',
        label: 'Uncategorized',
        actions: [action('act_legacy', 'cat_retired')],
      },
    ])
  })
})
