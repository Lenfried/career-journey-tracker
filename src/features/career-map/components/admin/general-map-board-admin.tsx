import {
  CAREER_MAP_TERMS,
  type CareerAction,
  type CareerMap,
  type CareerMapTerm,
  type LookupItem,
} from '@/lib/canonical'
import { formatCalendarDate } from '@/lib/dates'
import { CAREER_MAP_TERM_LABELS } from '@/lib/labels'
import { updateGeneralMapAction } from '../../actions'
import { groupActionsByCategory } from './action-groups'
import { CareerMapBoard, type CareerMapBoardItem } from './career-map-board'
import { FIELD_CLASS, PRIMARY_BUTTON_CLASS } from './form-field'

/** The department-wide map, arranged as the four-year plan students receive. */
export function GeneralMapAdmin({
  map,
  catalog,
  categories,
}: {
  map: CareerMap
  catalog: CareerAction[]
  categories: LookupItem[]
}) {
  const categoryLabel = new Map(
    categories.map((category) => [category.id, category.label]),
  )
  const actionsById = new Map(catalog.map((action) => [action.id, action]))
  const termByAction = new Map(
    map.placements.map((placement) => [placement.actionId, placement.term]),
  )
  const boardItems: CareerMapBoardItem[] = map.placements.flatMap(
    (placement) => {
      const action = actionsById.get(placement.actionId)
      if (!action) return []

      return [
        {
          id: action.id,
          term: placement.term,
          content: (
            <MapActionCard
              action={action}
              term={placement.term}
              categoryLabel={categoryLabel.get(action.categoryId)}
            />
          ),
        },
      ]
    },
  )
  const unplaced = catalog.filter((action) => !termByAction.has(action.id))
  const unplacedGroups = groupActionsByCategory(unplaced, categories)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">General map</h2>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
            This is the shared foundation for every student. Moving an action
            here updates everyone’s map; specialization changes belong in their
            own overlay editors.
          </p>
        </div>
        <div className="text-muted-foreground text-right text-xs">
          <p>Version {map.version}</p>
          <p>Reviewed {formatCalendarDate(map.lastReviewed)}</p>
        </div>
      </div>

      <form action={updateGeneralMapAction}>
        <CareerMapBoard items={boardItems} emptyMessage="No shared actions" />

        {unplaced.length > 0 ? (
          <details className="mt-5 rounded-lg border">
            <summary className="hover:bg-muted/40 flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <span>Add actions from the catalog</span>
              <span className="text-muted-foreground font-normal tabular-nums">
                {unplaced.length} not on the map
              </span>
            </summary>
            <div className="space-y-5 border-t p-4">
              {unplacedGroups.map((group) => (
                <section
                  key={group.id}
                  aria-labelledby={`unplaced-${group.id}`}
                >
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <h3
                      id={`unplaced-${group.id}`}
                      className="text-sm font-semibold"
                    >
                      {group.label}
                    </h3>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {group.actions.length}
                    </span>
                  </div>
                  <ul className="divide-y overflow-hidden rounded-md border">
                    {group.actions.map((action) => (
                      <li
                        key={action.id}
                        className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                      >
                        <p className="min-w-0 flex-1 text-sm font-medium">
                          {action.title}
                        </p>
                        <TermSelect
                          actionId={action.id}
                          actionTitle={action.title}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </details>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          <button type="submit" className={PRIMARY_BUTTON_CLASS}>
            Save general map
          </button>
          <p className="text-muted-foreground text-xs">
            Saves every move on this board together.
          </p>
        </div>
      </form>
    </div>
  )
}

function MapActionCard({
  action,
  term,
  categoryLabel,
}: {
  action: CareerAction
  term: CareerMapTerm
  categoryLabel?: string
}) {
  return (
    <article className="bg-card rounded-md border p-3">
      <p className="text-sm leading-snug font-medium">{action.title}</p>
      <p className="text-muted-foreground mt-1 text-xs">
        {categoryLabel ?? action.categoryId}
      </p>
      <label className="mt-3 block">
        <span className="sr-only">Term for {action.title}</span>
        <select
          name={`term-${action.id}`}
          defaultValue={term}
          className={`${FIELD_CLASS} py-1 text-xs`}
        >
          <option value="">Remove from map</option>
          {CAREER_MAP_TERMS.map((option) => (
            <option key={option} value={option}>
              {CAREER_MAP_TERM_LABELS[option]}
            </option>
          ))}
        </select>
      </label>
    </article>
  )
}

function TermSelect({
  actionId,
  actionTitle,
}: {
  actionId: string
  actionTitle: string
}) {
  return (
    <label>
      <span className="sr-only">Term for {actionTitle}</span>
      <select
        name={`term-${actionId}`}
        defaultValue=""
        className={`${FIELD_CLASS} w-52`}
      >
        <option value="">Not on the map</option>
        {CAREER_MAP_TERMS.map((term) => (
          <option key={term} value={term}>
            {CAREER_MAP_TERM_LABELS[term]}
          </option>
        ))}
      </select>
    </label>
  )
}
