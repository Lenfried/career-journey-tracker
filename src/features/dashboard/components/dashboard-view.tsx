import Link from 'next/link'
import { EmptyState } from '@/components/empty-state'
import { formatTimestamp } from '@/lib/dates'
import type { DashboardSummary } from '../types'

/**
 * MVP screen 7 — the minimal dashboard.
 *
 * Four lists: how many students, who is overdue for follow-up, who is behind on
 * their career map, and who changed recently. No charts. The question this page
 * answers is "what needs my attention today", which is a list, not a trend.
 */
export function DashboardView({ summary }: { summary: DashboardSummary }) {
  return (
    <>
      {/* Two counts, not three. A third card would have to be invented — and an
          invented number on a dashboard gets quoted in a meeting. */}
      <section className="mb-12 grid gap-4 sm:grid-cols-2">
        <StatCard label="Students" value={summary.studentCount} />
        <StatCard
          label="Overdue for follow-up"
          value={summary.overdueCount}
          emphasis={summary.overdueCount > 0}
        />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Overdue for follow-up
        </h2>

        {summary.overdue.length === 0 ? (
          <EmptyState
            title="Nobody is overdue."
            hint="A student appears here when the follow-up date on their most recent note has passed."
          />
        ) : (
          <ul className="divide-y overflow-hidden rounded-lg border">
            {summary.overdue.map(
              ({ student, followUpDateLabel, daysOverdue }) => (
                <li key={student.id}>
                  <Link
                    href={`/students/${student.id}`}
                    className="hover:bg-muted/50 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 py-4"
                  >
                    <span className="font-medium">{student.displayName}</span>
                    <span className="text-muted-foreground text-sm">
                      {student.programLabel} · {student.classificationLabel}
                    </span>
                    <span className="text-sm text-red-700 tabular-nums dark:text-red-400">
                      {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
                      <span className="text-muted-foreground ml-2">
                        (due {followUpDateLabel})
                      </span>
                    </span>
                  </Link>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      <section className="mb-12">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Behind on the career map
          </h2>
          {summary.behindCount > summary.behindOnMap.length ? (
            <span className="text-muted-foreground text-sm tabular-nums">
              showing {summary.behindOnMap.length} of {summary.behindCount}
            </span>
          ) : null}
        </div>

        {summary.behindOnMap.length === 0 ? (
          <EmptyState
            title="Nobody is behind on their plan."
            hint="A student appears here when a career map action from a term that has already passed is still open."
          />
        ) : (
          <ul className="divide-y overflow-hidden rounded-lg border">
            {summary.behindOnMap.map(({ student, status }) => (
              <li key={student.id}>
                <Link
                  href={`/students/${student.id}?tab=career-map`}
                  className="hover:bg-muted/50 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 py-4"
                >
                  <span className="font-medium">{student.displayName}</span>
                  <span className="text-muted-foreground text-sm">
                    {status.specializationLabel ??
                      status.trackLabel ??
                      'Exploring options'}
                    {status.currentTermLabel
                      ? ` · ${status.currentTermLabel}`
                      : ''}
                  </span>
                  <span className="text-sm text-amber-800 tabular-nums dark:text-amber-300">
                    {status.overdueCount}{' '}
                    {status.overdueCount === 1 ? 'action' : 'actions'} behind
                    <span className="text-muted-foreground ml-2">
                      ({status.doneCount} of {status.applicableCount} done)
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Recently updated
          </h2>
          <Link
            href="/students"
            className="text-muted-foreground text-sm hover:underline"
          >
            View all students
          </Link>
        </div>

        {summary.recentlyUpdated.length === 0 ? (
          <EmptyState title="No student records yet." />
        ) : (
          <ul className="divide-y overflow-hidden rounded-lg border">
            {summary.recentlyUpdated.map((student) => (
              <li key={student.id}>
                <Link
                  href={`/students/${student.id}`}
                  className="hover:bg-muted/50 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 py-4"
                >
                  <span className="font-medium">{student.displayName}</span>
                  <span className="text-muted-foreground text-sm">
                    {student.programLabel} · {student.classificationLabel}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {formatTimestamp(student.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function StatCard({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: number
  emphasis?: boolean
}) {
  return (
    <div className="bg-card rounded-lg border p-6">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p
        className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${
          emphasis ? 'text-red-700 dark:text-red-400' : ''
        }`}
      >
        {value}
      </p>
    </div>
  )
}
