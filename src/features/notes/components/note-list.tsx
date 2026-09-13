import { EmptyState } from '@/components/empty-state'
import type { AdvisingNoteView } from '../types'

export function NoteList({ notes }: { notes: AdvisingNoteView[] }) {
  if (notes.length === 0) {
    return (
      <EmptyState
        title="No advising notes yet."
        hint="Notes appear here newest first, with any follow-up date."
      />
    )
  }

  return (
    <ol className="space-y-4">
      {notes.map((note) => (
        <li key={note.id} className="bg-card rounded-lg border p-6">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-medium">{note.sessionDateLabel}</span>
            <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
              {note.typeLabel}
            </span>
            <span className="text-muted-foreground text-sm">
              {note.recordedBy}
            </span>

            {note.followUpLabel ? (
              <span
                className={`ml-auto text-sm ${
                  note.followUpOverdue
                    ? 'font-medium text-red-700 dark:text-red-400'
                    : 'text-muted-foreground'
                }`}
              >
                Follow-up {note.followUpLabel}
              </span>
            ) : null}
          </div>

          {/* Advising notes run long and carry deliberate paragraph breaks —
              `whitespace-pre-line` keeps them instead of collapsing the note
              into one wall of text. */}
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {note.content}
          </p>
        </li>
      ))}
    </ol>
  )
}
