import {
  CAREER_MAP_TERMS,
  type CareerAction,
  type CareerMapTerm,
} from '@/lib/canonical'
import { CAREER_MAP_TERM_LABELS } from '@/lib/labels'
import { setSpecializationActionOverrideAction } from '../../actions'
import { FIELD_CLASS, SECONDARY_BUTTON_CLASS } from './form-field'

export function SpecializationOverlayCard({
  specializationId,
  action,
  term,
  inherited,
  categoryLabel,
}: {
  specializationId: string
  action: CareerAction
  term: CareerMapTerm
  inherited: boolean
  categoryLabel?: string
}) {
  return (
    <article className="bg-card rounded-md border p-3">
      <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {inherited ? 'Moves inherited action' : 'Added by specialization'}
      </span>
      <p className="mt-1 text-sm leading-snug font-medium">{action.title}</p>
      <p className="text-muted-foreground mt-1 text-xs">
        {categoryLabel ?? action.categoryId}
      </p>
      <form
        action={setSpecializationActionOverrideAction.bind(
          null,
          specializationId,
        )}
        className="mt-3 space-y-2"
      >
        <input type="hidden" name="actionId" value={action.id} />
        <label className="block">
          <span className="sr-only">Placement for {action.title}</span>
          <select
            name="override"
            defaultValue={term}
            className={`${FIELD_CLASS} py-1 text-xs`}
          >
            <option value="default">
              {inherited ? 'Use general map placement' : 'Remove from overlay'}
            </option>
            {CAREER_MAP_TERMS.map((option) => (
              <option key={option} value={option}>
                {CAREER_MAP_TERM_LABELS[option]}
              </option>
            ))}
            {inherited ? (
              <option value="excluded">Exclude action</option>
            ) : null}
          </select>
        </label>
        <button type="submit" className={SECONDARY_BUTTON_CLASS}>
          Save card
        </button>
      </form>
    </article>
  )
}
