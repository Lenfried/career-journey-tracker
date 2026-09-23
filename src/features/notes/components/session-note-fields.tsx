import type { LookupItem } from '@/lib/canonical'

export const ADVISOR_FIELD_CLASS =
  'w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm focus-visible:outline-ring'

/** Shared session context for progress and skill decisions. */
export function SessionNoteFields({
  noteTypes,
  today,
}: {
  noteTypes: LookupItem[]
  today: string
}) {
  return (
    <fieldset className="space-y-3 border-t pt-4">
      <legend className="px-1 text-sm font-medium">Advising session</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span>Session date</span>
          <input
            type="date"
            name="sessionDate"
            defaultValue={today}
            required
            className={ADVISOR_FIELD_CLASS}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Note type</span>
          <select name="typeId" required className={ADVISOR_FIELD_CLASS}>
            {noteTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span>Reason for this update</span>
        <textarea
          name="content"
          rows={3}
          maxLength={5000}
          required
          className={ADVISOR_FIELD_CLASS}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Follow-up date (optional)</span>
        <input
          type="date"
          name="followUpDate"
          className={ADVISOR_FIELD_CLASS}
        />
      </label>
    </fieldset>
  )
}
