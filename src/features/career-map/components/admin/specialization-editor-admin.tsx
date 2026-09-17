import type {
  CareerAction,
  CareerMap,
  CareerSpecialization,
  CareerTrack,
  LookupItem,
} from '@/lib/canonical'
import { updateCareerSpecializationDetailsAction } from '../../actions'
import { Field, FIELD_CLASS, SECONDARY_BUTTON_CLASS } from './form-field'
import { SpecializationOverlayAdmin } from './specialization-overlay-admin'
import { SpecializationSkillsAdmin } from './specialization-skills-admin'

export function SpecializationEditorAdmin({
  tracks,
  specialization,
  generalMap,
  catalog,
  categories,
  studentCount,
}: {
  tracks: CareerTrack[]
  specialization: CareerSpecialization
  generalMap: CareerMap
  catalog: CareerAction[]
  categories: LookupItem[]
  studentCount: number
}) {
  return (
    <div className="space-y-10">
      <SpecializationOverlayAdmin
        specialization={specialization}
        generalMap={generalMap}
        catalog={catalog}
        categories={categories}
      />

      <SpecializationSkillsAdmin specialization={specialization} />

      <details className="max-w-2xl rounded-lg border">
        <summary className="hover:bg-muted/40 cursor-pointer list-none px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          Edit specialization details
        </summary>
        <form
          action={updateCareerSpecializationDetailsAction.bind(
            null,
            specialization.id,
          )}
          className="space-y-4 border-t p-4"
        >
          <p className="text-muted-foreground text-sm">
            {studentCount} student{studentCount === 1 ? ' is' : 's are'}
            currently in this specialization.
          </p>
          <Field label="Track">
            {studentCount > 0 ? (
              <input
                type="hidden"
                name="trackId"
                value={specialization.trackId}
              />
            ) : null}
            <select
              name={studentCount > 0 ? undefined : 'trackId'}
              defaultValue={specialization.trackId}
              disabled={studentCount > 0}
              required
              className={FIELD_CLASS}
            >
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.label}
                </option>
              ))}
            </select>
            {studentCount > 0 ? (
              <span className="text-muted-foreground block text-xs">
                Move assigned students before changing the parent track.
              </span>
            ) : null}
          </Field>
          <Field label="Label">
            <input
              name="label"
              defaultValue={specialization.label}
              required
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Description">
            <textarea
              name="description"
              defaultValue={specialization.description}
              required
              rows={2}
              className={FIELD_CLASS}
            />
          </Field>
          <button type="submit" className={SECONDARY_BUTTON_CLASS}>
            Save details
          </button>
        </form>
      </details>
    </div>
  )
}
