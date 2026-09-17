import Link from 'next/link'
import type { CareerMapStatus } from '../types'

/**
 * The career map in one line, for the overview tab.
 *
 * The overview answers "who is this student and where are they"; the plan
 * belongs in that answer, but not all eleven terms of it. This is the hook into
 * the tab, and it leads with the two numbers an advisor acts on — what is left
 * this term, and what is behind.
 */
export function CareerMapStrip({
  studentId,
  status,
}: {
  studentId: string
  status: CareerMapStatus
}) {
  return (
    <Link
      href={`/students/${studentId}?tab=career-map`}
      className="bg-card hover:bg-muted/40 block rounded-lg border px-4 py-3"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium">
          {status.trackLabel ?? 'General career map'}
        </span>
        <span className="text-muted-foreground text-sm">
          {status.currentTermLabel ??
            (status.state === 'paused' ? 'On leave' : 'Plan complete')}
        </span>

        <span className="text-muted-foreground ml-auto text-sm tabular-nums">
          {status.doneCount} of {status.applicableCount} done
        </span>
      </div>

      <p className="mt-1 text-sm">
        {status.focusCount > 0 ? (
          <span>
            {status.focusCount} left this term
            {status.overdueCount > 0 ? (
              <span aria-hidden="true"> · </span>
            ) : null}
          </span>
        ) : null}
        {status.overdueCount > 0 ? (
          <span className="font-medium text-amber-800 dark:text-amber-300">
            {status.overdueCount} behind
          </span>
        ) : null}
        {status.focusCount === 0 && status.overdueCount === 0 ? (
          <span className="text-muted-foreground">
            Nothing outstanding this term.
          </span>
        ) : null}
      </p>
    </Link>
  )
}
