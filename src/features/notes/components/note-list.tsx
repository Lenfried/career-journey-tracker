import { EmptyState } from '@/components/empty-state'
import type { LookupItem } from '@/lib/canonical'
import {
  createAdvisingNoteAction,
  deleteAdvisingNoteAction,
  updateAdvisingNoteAction,
} from '../actions'
import type { AdvisingNoteView } from '../types'
import { NoteForm } from './note-form'

export function NoteList({
  studentId,
  notes,
  noteTypes,
  today,
}: {
  studentId: string
  notes: AdvisingNoteView[]
  noteTypes: LookupItem[]
  today: string
}) {
  return (
    <div className="space-y-6">
      <details open={notes.length === 0} className="rounded-lg border">
        <summary className="hover:bg-muted/40 cursor-pointer list-none px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
          Add advising note
        </summary>
        <div className="border-t p-4">
          <NoteForm
            action={createAdvisingNoteAction.bind(null, studentId)}
            noteTypes={noteTypes}
            today={today}
            submitLabel="Add note"
          />
        </div>
      </details>
      {notes.length === 0 ? (
        <EmptyState
          title="No advising notes yet."
          hint="Record the first advising conversation above."
        />
      ) : (
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
              <details className="mt-4 border-t pt-3">
                <summary className="text-muted-foreground cursor-pointer list-none text-sm hover:underline [&::-webkit-details-marker]:hidden">
                  Edit note
                </summary>
                <div className="mt-4 space-y-4">
                  <NoteForm
                    action={updateAdvisingNoteAction.bind(
                      null,
                      studentId,
                      note.id,
                    )}
                    note={note}
                    noteTypes={noteTypes}
                    today={today}
                    submitLabel="Save note"
                  />
                  <form
                    action={deleteAdvisingNoteAction.bind(
                      null,
                      studentId,
                      note.id,
                    )}
                  >
                    <button
                      type="submit"
                      className="text-sm text-red-700 hover:underline dark:text-red-400"
                    >
                      Delete note
                    </button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
