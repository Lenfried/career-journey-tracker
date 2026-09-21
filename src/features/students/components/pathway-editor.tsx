import type { LookupItem } from '@/lib/canonical'
import { todayOnCampus } from '@/lib/dates'
import type { CareerMapView } from '@/features/career-map/types'
import { recordPathwayDecisionAction } from '../actions'

export function PathwayEditor({
  studentId,
  map,
  noteTypes,
}: {
  studentId: string
  map: CareerMapView
  noteTypes: LookupItem[]
}) {
  const current = map.specializationId
    ? `specialization:${map.specializationId}`
    : map.trackId
      ? `track:${map.trackId}`
      : ''
  return (
    <details className="rounded-lg border">
      <summary className="hover:bg-muted/40 cursor-pointer list-none px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
        Record pathway decision
      </summary>
      <div className="border-t p-4">
        <form
          action={recordPathwayDecisionAction.bind(null, studentId)}
          className="space-y-4"
        >
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground font-medium">
              Track and specialization
            </span>
            <select
              name="pathway"
              defaultValue={current}
              className="border-input w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm"
            >
              <option value="">Exploring options</option>
              {map.availableTracks.map((track) => (
                <optgroup key={track.id} label={track.label}>
                  <option value={`track:${track.id}`}>
                    {track.label} — specialization not selected
                  </option>
                  {track.specializations.map((specialization) => (
                    <option
                      key={specialization.id}
                      value={`specialization:${specialization.id}`}
                    >
                      {specialization.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <NoteFormFields noteTypes={noteTypes} />
          <button
            type="submit"
            className="bg-foreground text-background rounded-lg px-4 py-1.5 text-sm font-medium hover:opacity-90"
          >
            Record update
          </button>
        </form>
      </div>
    </details>
  )
}

function NoteFormFields({ noteTypes }: { noteTypes: LookupItem[] }) {
  const field =
    'w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm'
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground font-medium">
            Session date
          </span>
          <input
            name="sessionDate"
            type="date"
            required
            defaultValue={todayOnCampus()}
            className={field}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground font-medium">Note type</span>
          <select
            name="typeId"
            required
            defaultValue="note_career"
            className={field}
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
        <span className="text-muted-foreground font-medium">Decision note</span>
        <textarea
          name="content"
          required
          rows={3}
          className={field}
          placeholder="What was decided, and why?"
        />
      </label>
      <label className="block max-w-sm space-y-1 text-sm">
        <span className="text-muted-foreground font-medium">
          Follow-up date (optional)
        </span>
        <input name="followUpDate" type="date" className={field} />
      </label>
    </>
  )
}
