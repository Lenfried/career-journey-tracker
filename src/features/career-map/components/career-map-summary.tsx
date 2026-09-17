import type { CareerMapView } from '../types'

/**
 * The header card: which plan, where the student is on it, and how much of it
 * is behind them.
 *
 * "Joined the map at" is here rather than buried in the timeline because it is
 * the fact that explains every empty term above it. Without it, a transfer
 * student's plan reads as two years of neglect.
 */
export function CareerMapSummary({ map }: { map: CareerMapView }) {
  return (
    <div className="bg-card rounded-lg border">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b px-6 py-4">
        <div className="min-w-0">
          <h3 className="font-medium">
            {map.trackLabel ?? 'General career map'}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {map.position.currentTermLabel ??
              (map.position.state === 'paused'
                ? 'On leave — nothing is overdue while a student is away'
                : 'Past the end of the plan')}
            {' · '}
            {map.position.academicTermLabel}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="bg-muted h-2 w-24 overflow-hidden rounded-full"
            role="presentation"
          >
            <div
              className="bg-foreground h-full rounded-full"
              style={{ width: `${map.progressPercent}%` }}
            />
          </div>
          <span className="text-muted-foreground text-sm tabular-nums">
            {map.doneCount} of {map.applicableCount} done
          </span>
        </div>
      </div>

      <dl className="divide-muted grid gap-x-6 gap-y-3 px-6 py-4 text-sm sm:grid-cols-3">
        <Fact term="Joined the map at" detail={map.startedTermLabel} />
        <Fact
          term="Behind on"
          detail={
            map.overdueActions.length === 0
              ? 'Nothing'
              : `${map.overdueActions.length} ${map.overdueActions.length === 1 ? 'action' : 'actions'}`
          }
        />
        <Fact term="Plan last reviewed" detail={map.lastReviewedLabel} />
      </dl>
    </div>
  )
}

function Fact({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{term}</dt>
      <dd className="mt-0.5">{detail}</dd>
    </div>
  )
}
