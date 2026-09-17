import type { CareerAction, LookupItem } from '@/lib/canonical'
import {
  createCareerActionAction,
  deleteCareerActionAction,
  updateCareerActionAction,
} from '../../actions'
import {
  Field,
  FIELD_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from './form-field'

type EvidenceOptions = {
  milestoneTypes: LookupItem[]
  noteTypes: LookupItem[]
  artifactTypes: LookupItem[]
}

export function CatalogAdmin({
  catalog,
  categories,
  evidenceOptions,
}: {
  catalog: CareerAction[]
  categories: LookupItem[]
  evidenceOptions: EvidenceOptions
}) {
  const categoryLabel = new Map(categories.map((c) => [c.id, c.label]))

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          {catalog.length} action{catalog.length === 1 ? '' : 's'}
        </h2>

        <ul className="divide-y overflow-hidden rounded-lg border">
          {catalog.map((action) => (
            <li key={action.id}>
              <details className="group">
                <summary className="hover:bg-muted/40 flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="font-medium">{action.title}</span>
                  <span className="text-muted-foreground text-sm">
                    {categoryLabel.get(action.categoryId) ?? action.categoryId}
                  </span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    <code>{action.id}</code>
                  </span>
                  <span
                    className="text-muted-foreground text-xs"
                    aria-hidden="true"
                  >
                    <span className="group-open:hidden">Edit</span>
                    <span className="hidden group-open:inline">Close</span>
                  </span>
                </summary>

                <div className="space-y-4 border-t px-4 py-4">
                  <ActionForm
                    formAction={updateCareerActionAction.bind(null, action.id)}
                    defaults={action}
                    categories={categories}
                    evidenceOptions={evidenceOptions}
                    submitLabel="Save changes"
                  />

                  <form
                    action={deleteCareerActionAction.bind(null, action.id)}
                    className="border-t pt-4"
                  >
                    <button
                      type="submit"
                      className="text-sm text-red-700 hover:underline dark:text-red-400"
                    >
                      Delete this action
                    </button>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Blocked if it is placed on the general map, referenced by
                      a track, or a student has progress recorded against it.
                    </p>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Add an action
        </h2>
        <div className="rounded-lg border p-4">
          <ActionForm
            formAction={createCareerActionAction}
            categories={categories}
            evidenceOptions={evidenceOptions}
            submitLabel="Add action"
          />
        </div>
      </section>
    </div>
  )
}

function ActionForm({
  formAction,
  defaults,
  categories,
  evidenceOptions,
  submitLabel,
}: {
  formAction: (formData: FormData) => Promise<void>
  defaults?: CareerAction
  categories: LookupItem[]
  evidenceOptions: EvidenceOptions
  submitLabel: string
}) {
  const evidenceValue = defaults?.evidence
    ? `${defaults.evidence.kind}:${defaults.evidence.typeId}`
    : ''

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Title">
        <input
          name="title"
          defaultValue={defaults?.title}
          required
          className={FIELD_CLASS}
        />
      </Field>

      <Field label="Why it matters">
        <textarea
          name="why"
          defaultValue={defaults?.why}
          required
          rows={2}
          className={FIELD_CLASS}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <select
            name="categoryId"
            defaultValue={defaults?.categoryId ?? categories[0]?.id}
            required
            className={FIELD_CLASS}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Target count">
          <input
            type="number"
            name="targetCount"
            min={1}
            defaultValue={defaults?.targetCount ?? 1}
            required
            className={FIELD_CLASS}
          />
        </Field>
      </div>

      <Field label="Evidence hint">
        <select
          name="evidence"
          defaultValue={evidenceValue}
          className={FIELD_CLASS}
        >
          <option value="">No evidence hint</option>
          <optgroup label="Milestone">
            {evidenceOptions.milestoneTypes.map((type) => (
              <option key={type.id} value={`milestone:${type.id}`}>
                {type.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Readiness artifact">
            {evidenceOptions.artifactTypes.map((type) => (
              <option key={type.id} value={`artifact:${type.id}`}>
                {type.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Advising note">
            {evidenceOptions.noteTypes.map((type) => (
              <option key={type.id} value={`note:${type.id}`}>
                {type.label}
              </option>
            ))}
          </optgroup>
        </select>
      </Field>

      <Field label="Resource link (optional)">
        <input
          type="url"
          name="resourceUrl"
          defaultValue={defaults?.resourceUrl ?? ''}
          placeholder="https://…"
          className={FIELD_CLASS}
        />
      </Field>

      <button
        type="submit"
        className={defaults ? SECONDARY_BUTTON_CLASS : PRIMARY_BUTTON_CLASS}
      >
        {submitLabel}
      </button>
    </form>
  )
}
