import type {
  CareerAction,
  CareerMap,
  CareerSpecialization,
  LookupItem,
} from '@/lib/canonical'
import { setSpecializationActionOverrideAction } from '../../actions'
import { CareerMapBoard, type CareerMapBoardItem } from './career-map-board'
import { SECONDARY_BUTTON_CLASS } from './form-field'
import { SpecializationOverlayCard } from './specialization-overlay-card'
import { SpecializationOverlayControls } from './specialization-overlay-controls'

export function SpecializationOverlayAdmin({
  specialization,
  generalMap,
  catalog,
  categories,
}: {
  specialization: CareerSpecialization
  generalMap: CareerMap
  catalog: CareerAction[]
  categories: LookupItem[]
}) {
  const categoryLabel = new Map(
    categories.map((category) => [category.id, category.label]),
  )
  const actionsById = new Map(catalog.map((action) => [action.id, action]))
  const generalTerms = new Map(
    generalMap.placements.map((placement) => [
      placement.actionId,
      placement.term,
    ]),
  )
  const overriddenIds = new Set([
    ...specialization.placements.map((placement) => placement.actionId),
    ...specialization.excludes,
  ])
  const availableActions = catalog.filter(
    (action) => !overriddenIds.has(action.id),
  )
  const excludableActions = generalMap.placements.flatMap((placement) => {
    if (overriddenIds.has(placement.actionId)) return []
    const action = actionsById.get(placement.actionId)
    return action ? [action] : []
  })
  const boardItems: CareerMapBoardItem[] = specialization.placements.flatMap(
    (placement) => {
      const action = actionsById.get(placement.actionId)
      if (!action) return []

      return [
        {
          id: action.id,
          term: placement.term,
          content: (
            <SpecializationOverlayCard
              specializationId={specialization.id}
              action={action}
              term={placement.term}
              inherited={generalTerms.has(action.id)}
              categoryLabel={categoryLabel.get(action.categoryId)}
            />
          ),
        },
      ]
    },
  )

  return (
    <section aria-labelledby="specialization-overlay">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="specialization-overlay"
            className="text-lg font-semibold tracking-tight"
          >
            Specialization overlay
          </h2>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
            Only changes unique to this specialization appear here. The shared
            general map remains in its own editor and continues to apply
            underneath this layer.
          </p>
        </div>
        <span className="text-muted-foreground text-sm tabular-nums">
          {specialization.placements.length} scheduled ·{' '}
          {specialization.excludes.length} excluded
        </span>
      </div>

      <CareerMapBoard items={boardItems} emptyMessage="No overlay actions" />

      {specialization.excludes.length > 0 ? (
        <section
          aria-labelledby="excluded-actions"
          className="mt-5 rounded-lg border"
        >
          <header className="border-b px-4 py-3">
            <h3 id="excluded-actions" className="font-semibold">
              Excluded inherited actions
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              These remain on the general map but do not apply to this
              specialization.
            </p>
          </header>
          <ul className="divide-y">
            {specialization.excludes.map((actionId) => {
              const action = actionsById.get(actionId)
              if (!action) return null

              return (
                <li
                  key={action.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {categoryLabel.get(action.categoryId) ??
                        action.categoryId}
                    </p>
                  </div>
                  <form
                    action={setSpecializationActionOverrideAction.bind(
                      null,
                      specialization.id,
                    )}
                  >
                    <input type="hidden" name="actionId" value={action.id} />
                    <input type="hidden" name="override" value="default" />
                    <button type="submit" className={SECONDARY_BUTTON_CLASS}>
                      Restore inherited action
                    </button>
                  </form>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <SpecializationOverlayControls
        specializationId={specialization.id}
        availableActions={availableActions}
        excludableActions={excludableActions}
        categories={categories}
      />
    </section>
  )
}
