import {
  CAREER_MAP_TERMS,
  type CareerAction,
  type CareerMap,
} from '@/lib/canonical'
import { CAREER_MAP_TERM_LABELS } from '@/lib/labels'
import { updateGeneralMapAction } from '../../actions'
import { FIELD_CLASS, PRIMARY_BUTTON_CLASS } from './form-field'

/**
 * One term picker per catalog action, all submitted together.
 *
 * This is the whole general map, not one placement at a time — an admin
 * moving three actions between terms should not need three separate saves,
 * and `updateGeneralMapAction` is written to replace the plan in one call.
 */
export function GeneralMapAdmin({
  map,
  catalog,
  categoryLabel,
}: {
  map: CareerMap
  catalog: CareerAction[]
  categoryLabel: Map<string, string>
}) {
  const termByAction = new Map(map.placements.map((p) => [p.actionId, p.term]))

  return (
    <div>
      <div className="text-muted-foreground mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span>{map.label}</span>
        <span>· v{map.version}</span>
        <span>
          · last reviewed{' '}
          {new Date(map.lastReviewed + 'T00:00:00').toLocaleDateString(
            'en-US',
            { dateStyle: 'medium' },
          )}
        </span>
      </div>

      <form action={updateGeneralMapAction}>
        <ul className="divide-y overflow-hidden rounded-lg border">
          {catalog.map((action) => (
            <li
              key={action.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{action.title}</p>
                <p className="text-muted-foreground text-xs">
                  {categoryLabel.get(action.categoryId) ?? action.categoryId}
                </p>
              </div>

              <select
                name={`term-${action.id}`}
                defaultValue={termByAction.get(action.id) ?? ''}
                className={`${FIELD_CLASS} w-48 shrink-0`}
              >
                <option value="">Not on the map</option>
                {CAREER_MAP_TERMS.map((term) => (
                  <option key={term} value={term}>
                    {CAREER_MAP_TERM_LABELS[term]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>

        <button type="submit" className={`${PRIMARY_BUTTON_CLASS} mt-4`}>
          Save general map
        </button>
      </form>
    </div>
  )
}
