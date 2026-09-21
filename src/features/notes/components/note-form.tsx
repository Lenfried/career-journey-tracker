import type { LookupItem } from '@/lib/canonical'
import type { AdvisingNoteView } from '../types'

const FIELD =
  'w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function NoteForm({
  action,
  note,
  noteTypes,
  today,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>
  note?: AdvisingNoteView
  noteTypes: LookupItem[]
  today: string
  submitLabel: string
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground font-medium">
            Session date
          </span>
          <input
            type="date"
            name="sessionDate"
            required
            defaultValue={note?.sessionDate ?? today}
            className={FIELD}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground font-medium">Note type</span>
          <select
            name="typeId"
            required
            defaultValue={note?.typeId ?? noteTypes[0]?.id}
            className={FIELD}
          >
            {noteTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground font-medium">Advising note</span>
        <textarea
          name="content"
          required
          rows={4}
          defaultValue={note?.content}
          className={FIELD}
        />
      </label>
      <label className="block max-w-sm space-y-1 text-sm">
        <span className="text-muted-foreground font-medium">
          Follow-up date (optional)
        </span>
        <input
          type="date"
          name="followUpDate"
          defaultValue={note?.followUpDate ?? ''}
          className={FIELD}
        />
      </label>
      <button
        type="submit"
        className="bg-foreground text-background rounded-lg px-4 py-1.5 text-sm font-medium hover:opacity-90"
      >
        {submitLabel}
      </button>
    </form>
  )
}
