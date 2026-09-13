import { EmptyState } from '@/components/empty-state'
import type { CareerGoalView } from '../types'

const CONFIDENCE_STYLES = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  high: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
} as const

export function CareerGoalCard({ goal }: { goal: CareerGoalView | null }) {
  if (!goal) {
    return (
      <EmptyState
        title="No career goal recorded."
        hint="Not a gap to close on its own — for a first-year student this is the expected state."
      />
    )
  }

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-base leading-relaxed">{goal.statement}</p>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${CONFIDENCE_STYLES[goal.confidence]}`}
        >
          {goal.confidenceLabel}
        </span>
      </div>

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Row label="Target role" value={goal.targetRole} />
        <Row label="Target industry" value={goal.targetIndustry} />
        <Row label="Timeline" value={goal.timeline} />
        <Row label="Last discussed" value={goal.lastDiscussedLabel} />
      </dl>

      {goal.advisorNotes ? (
        <div className="mt-4 border-t pt-4">
          <p className="text-muted-foreground mb-1 text-xs font-medium">
            Advisor notes on this goal
          </p>
          <p className="text-sm">{goal.advisorNotes}</p>
        </div>
      ) : null}
    </div>
  )
}

/** Renders "Not recorded" rather than hiding the row — an advisor needs to see
    which questions have not been asked yet, not a shorter list. */
function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className={value ? 'mt-0.5' : 'text-muted-foreground mt-0.5 italic'}>
        {value ?? 'Not recorded'}
      </dd>
    </div>
  )
}
