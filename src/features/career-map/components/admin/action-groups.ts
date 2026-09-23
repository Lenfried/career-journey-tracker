import type { CareerAction, LookupItem } from '@/lib/canonical'

export type CareerActionGroup = {
  id: string
  label: string
  actions: CareerAction[]
}

/** Groups actions in configured category order without hiding unknown ids. */
export function groupActionsByCategory(
  actions: CareerAction[],
  categories: LookupItem[],
): CareerActionGroup[] {
  const actionsByCategory = new Map(
    categories.map((category) => [category.id, [] as CareerAction[]]),
  )
  const uncategorized: CareerAction[] = []

  for (const action of actions) {
    const group = actionsByCategory.get(action.categoryId)
    if (group) group.push(action)
    else uncategorized.push(action)
  }

  const groups = categories.flatMap((category) => {
    const groupedActions = actionsByCategory.get(category.id) ?? []
    return groupedActions.length > 0
      ? [{ id: category.id, label: category.label, actions: groupedActions }]
      : []
  })

  if (uncategorized.length > 0) {
    groups.push({
      id: 'uncategorized',
      label: 'Uncategorized',
      actions: uncategorized,
    })
  }

  return groups
}
