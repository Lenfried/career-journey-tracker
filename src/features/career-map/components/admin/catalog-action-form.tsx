import type { CareerAction, LookupItem } from '@/lib/canonical'
import {
  Field,
  FIELD_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from './form-field'

export type EvidenceOptions = {
  milestoneTypes: LookupItem[]
  noteTypes: LookupItem[]
  artifactTypes: LookupItem[]
}

export function CatalogActionForm({
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
  const hasConfiguredCategory =
    !defaults ||
    categories.some((category) => category.id === defaults.categoryId)

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
            {!hasConfiguredCategory && defaults ? (
              <option value={defaults.categoryId}>
                Uncategorized ({defaults.categoryId})
              </option>
            ) : null}
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
