import { EmptyState } from '@/components/empty-state'
import type { CareerMapTermView, CareerMapView } from '../types'
import { CareerMapSummary } from './career-map-summary'

import { ActionRow, STATUS_STYLES } from './career-action-row'
import type { ActionEditorContext } from './progress-editor'

/**
 * The career map, as a vertical timeline of terms.
 *
 * Collapsing is `<details>`, not state — the whole tab is a Server Component
 * with no client JavaScript, and the native element is keyboard-operable and
 * announced correctly without any of the work a hand-rolled disclosure needs.
 * Only the current term opens by default: an advisor arriving here in a
 * twenty-minute meeting wants this term, not eleven of them.
 */
export function CareerMapTimeline({
  map,
  context,
}: {
  map: CareerMapView | null
  context: ActionEditorContext
}) {
  if (!map) {
    return (
      <EmptyState
        title="No career map is published."
        hint="Everyone is on the same map, so this means the department has not published one — not that this student was missed."
      />
    )
  }

  return (
    <div className="space-y-8">
      <CareerMapSummary map={map} />

      {map.focusActions.length > 0 ? (
        <section aria-labelledby="career-map-focus">
          <h3 id="career-map-focus" className="mb-3 font-medium">
            This term
            <span className="text-muted-foreground ml-2 text-sm font-normal tabular-nums">
              {map.focusActions.length} left
            </span>
          </h3>
          <ul className="divide-y overflow-hidden rounded-lg border">
            {map.focusActions.map((action) => (
              <ActionRow
                key={action.actionId}
                action={action}
                context={context}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="career-map-timeline">
        <h3 id="career-map-timeline" className="mb-3 font-medium">
          Four-year plan
        </h3>
        <ol className="space-y-2">
          {map.terms.map((term) => (
            <li key={term.term}>
              <TermSection term={term} context={context} />
            </li>
          ))}
        </ol>
      </section>

      {map.previousSpecializationWork.length > 0 ? (
        <section aria-labelledby="career-map-previous">
          <h3 id="career-map-previous" className="mb-1 font-medium">
            Recorded under a previous specialization
          </h3>
          <p className="text-muted-foreground mb-3 text-sm">
            These are not on{' '}
            {map.specializationLabel ?? 'the current specialization'} any more.
            The work still happened.
          </p>
          <ul className="divide-y overflow-hidden rounded-lg border">
            {map.previousSpecializationWork.map((action) => (
              <li key={action.actionId} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-medium">{action.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[action.status]}`}
                  >
                    {action.statusLabel}
                  </span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {action.markedAtLabel}
                  </span>
                </div>
                {action.note ? (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {action.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function TermSection({
  term,
  context,
}: {
  term: CareerMapTermView
  context: ActionEditorContext
}) {
  const isCurrent = term.timing === 'current'

  return (
    <details
      open={isCurrent}
      className={`group rounded-lg border ${isCurrent ? 'border-foreground/30' : ''}`}
    >
      <summary
        aria-current={isCurrent ? 'step' : undefined}
        className="hover:bg-muted/40 flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg px-4 py-3 [&::-webkit-details-marker]:hidden"
      >
        <span className="font-medium">{term.termLabel}</span>
        <TermBadge term={term} />

        <span className="text-muted-foreground ml-auto text-sm tabular-nums">
          {term.actions.length === 0
            ? 'Nothing planned'
            : `${term.doneCount} of ${term.applicableCount} done`}
        </span>

        {term.overdueCount > 0 ? (
          <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
            {term.overdueCount} overdue
          </span>
        ) : null}

        {/* The affordance that says this row opens. `<details>` already
            announces its own expanded state, so this is decoration for the
            eye only — hence aria-hidden, and hence no JavaScript. */}
        <span className="text-muted-foreground text-xs" aria-hidden="true">
          <span className="group-open:hidden">Show</span>
          <span className="hidden group-open:inline">Hide</span>
        </span>
      </summary>

      {term.actions.length > 0 ? (
        <ul className="divide-y border-t">
          {term.actions.map((action) => (
            <ActionRow
              key={action.actionId}
              action={action}
              context={context}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground border-t px-4 py-3 text-sm">
          Nothing is planned for this term.
        </p>
      )}
    </details>
  )
}

/** Never colour alone — every state here is a word first. */
function TermBadge({ term }: { term: CareerMapTermView }) {
  if (term.beforeStart) {
    return (
      <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs">
        Before they joined
      </span>
    )
  }
  if (term.timing === 'current') {
    return (
      <span className="bg-foreground text-background rounded-full px-2 py-0.5 text-xs font-medium">
        This term
      </span>
    )
  }
  if (term.timing === 'future') {
    return (
      <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
        Upcoming
      </span>
    )
  }
  return null
}
