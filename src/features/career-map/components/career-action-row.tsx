import type { CareerActionStatus } from '@/lib/canonical'
import type { CareerActionView } from '../types'
import { ProgressEditor, type ActionEditorContext } from './progress-editor'

export const STATUS_STYLES: Record<CareerActionStatus, string> = {
  'not-started': 'bg-muted text-muted-foreground',
  'in-progress':
    'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  done: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  'not-applicable': 'bg-muted text-muted-foreground',
}

export function ActionRow({
  action,
  context,
}: {
  action: CareerActionView
  context: ActionEditorContext
}) {
  return (
    <li className={action.overdue ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}>
      <details>
        <summary className="hover:bg-muted/40 flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
          <span className="font-medium">{action.title}</span>
          <span className="text-muted-foreground text-xs">Update progress</span>

          {action.targetCount > 1 ? (
            <span className="text-muted-foreground text-xs tabular-nums">
              {action.completedCount} of {action.targetCount}
            </span>
          ) : null}

          <span className="text-muted-foreground text-xs">
            {action.categoryLabel}
          </span>

          {action.overdue ? (
            <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
              Overdue
            </span>
          ) : null}

          <span
            className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[action.status]}`}
          >
            {action.statusLabel}
          </span>
        </summary>
        <div className="space-y-3 border-t px-4 py-4">
          <p className="text-muted-foreground mt-1 text-sm">{action.why}</p>

          {action.carriedOver ? (
            <p className="mt-1 text-sm text-sky-800 dark:text-sky-300">
              Moved here from {action.movedFromTermLabel}
              {action.moveReasonLabel ? ` — ${action.moveReasonLabel}` : ''}
            </p>
          ) : null}

          {action.note ? (
            <p className="text-muted-foreground mt-1 text-sm">{action.note}</p>
          ) : null}

          {action.evidenceHint ? (
            // A hint, not a tick: the advisor still confirms. Saying where it
            // came from is what makes it something to check rather than trust.
            <p className="text-muted-foreground mt-1 text-sm">
              {action.evidenceHint} — not confirmed yet
            </p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {action.resourceUrl ? (
              <a
                href={action.resourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm underline underline-offset-2"
              >
                Details
              </a>
            ) : null}
            {action.markedBy ? (
              <span className="text-muted-foreground text-xs">
                {action.statusLabel} · {action.markedBy} ·{' '}
                {action.markedAtLabel}
              </span>
            ) : null}
          </div>
          <ProgressEditor
            key={`${action.status}-${action.completedCount}-${action.markedAtLabel}`}
            action={action}
            context={context}
          />
        </div>
      </details>
    </li>
  )
}
