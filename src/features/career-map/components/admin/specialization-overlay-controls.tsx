import {
  CAREER_MAP_TERMS,
  type CareerAction,
  type LookupItem,
} from '@/lib/canonical'
import { CAREER_MAP_TERM_LABELS } from '@/lib/labels'
import { setSpecializationActionOverrideAction } from '../../actions'
import { groupActionsByCategory } from './action-groups'
import {
  FIELD_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from './form-field'

export function SpecializationOverlayControls({
  specializationId,
  availableActions,
  excludableActions,
  categories,
}: {
  specializationId: string
  availableActions: CareerAction[]
  excludableActions: CareerAction[]
  categories: LookupItem[]
}) {
  return (
    <details className="mt-5 rounded-lg border">
      <summary className="hover:bg-muted/40 cursor-pointer list-none px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        Add an overlay change
      </summary>
      <div className="grid gap-6 border-t p-4 lg:grid-cols-2">
        <AddPlacementForm
          specializationId={specializationId}
          actions={availableActions}
          categories={categories}
        />
        <ExcludeActionForm
          specializationId={specializationId}
          actions={excludableActions}
          categories={categories}
        />
      </div>
    </details>
  )
}

function AddPlacementForm({
  specializationId,
  actions,
  categories,
}: {
  specializationId: string
  actions: CareerAction[]
  categories: LookupItem[]
}) {
  return (
    <form
      action={setSpecializationActionOverrideAction.bind(
        null,
        specializationId,
      )}
      className="space-y-3"
    >
      <div>
        <h3 className="font-medium">Add or move an action</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Choose an inherited or catalog action and place it on this overlay.
        </p>
      </div>
      {actions.length > 0 ? (
        <>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground font-medium">Action</span>
            <select name="actionId" required className={FIELD_CLASS}>
              <GroupedActionOptions actions={actions} categories={categories} />
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground font-medium">Term</span>
            <select name="override" required className={FIELD_CLASS}>
              {CAREER_MAP_TERMS.map((term) => (
                <option key={term} value={term}>
                  {CAREER_MAP_TERM_LABELS[term]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={PRIMARY_BUTTON_CLASS}>
            Add to overlay
          </button>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          Every catalog action already has an overlay rule.
        </p>
      )}
    </form>
  )
}

function ExcludeActionForm({
  specializationId,
  actions,
  categories,
}: {
  specializationId: string
  actions: CareerAction[]
  categories: LookupItem[]
}) {
  return (
    <form
      action={setSpecializationActionOverrideAction.bind(
        null,
        specializationId,
      )}
      className="space-y-3"
    >
      <input type="hidden" name="override" value="excluded" />
      <div>
        <h3 className="font-medium">Exclude an inherited action</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Remove one general-map action from this specialization only.
        </p>
      </div>
      {actions.length > 0 ? (
        <>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground font-medium">Action</span>
            <select name="actionId" required className={FIELD_CLASS}>
              <GroupedActionOptions actions={actions} categories={categories} />
            </select>
          </label>
          <button type="submit" className={SECONDARY_BUTTON_CLASS}>
            Exclude action
          </button>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          No inherited actions are available to exclude.
        </p>
      )}
    </form>
  )
}

function GroupedActionOptions({
  actions,
  categories,
}: {
  actions: CareerAction[]
  categories: LookupItem[]
}) {
  return groupActionsByCategory(actions, categories).map((group) => (
    <optgroup key={group.id} label={group.label}>
      {group.actions.map((action) => (
        <option key={action.id} value={action.id}>
          {action.title}
        </option>
      ))}
    </optgroup>
  ))
}
