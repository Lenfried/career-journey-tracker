import type { ArtifactStatus } from '@/lib/canonical'
import type { ReadinessView } from '../types'

const STATUS_STYLES: Record<ArtifactStatus, string> = {
  none: 'bg-muted text-muted-foreground',
  'in-progress':
    'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  'needs-review': 'bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  complete:
    'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
}

export function ReadinessChecklist({
  readiness,
}: {
  readiness: ReadinessView
}) {
  return (
    <div className="bg-card rounded-lg border">
      <div className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <h3 className="font-medium">Readiness artifacts</h3>
        <div className="flex items-center gap-3">
          <div
            className="bg-muted h-2 w-24 overflow-hidden rounded-full"
            role="presentation"
          >
            <div
              className="bg-foreground h-full rounded-full"
              style={{ width: `${readiness.progressPercent}%` }}
            />
          </div>
          <span className="text-muted-foreground text-sm tabular-nums">
            {readiness.completeCount} of {readiness.total} complete
          </span>
        </div>
      </div>

      <ul className="divide-y">
        {readiness.artifacts.map((artifact) => (
          <li
            key={artifact.typeId}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-6 py-4"
          >
            <div className="min-w-0">
              <p className="font-medium">{artifact.typeLabel}</p>
              {artifact.url ? (
                <a
                  href={artifact.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-muted-foreground block truncate text-sm hover:underline"
                >
                  {artifact.url}
                </a>
              ) : null}
              {artifact.advisorNotes ? (
                <p className="text-muted-foreground mt-1 text-sm">
                  {artifact.advisorNotes}
                </p>
              ) : null}
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[artifact.status]}`}
            >
              {artifact.statusLabel}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
