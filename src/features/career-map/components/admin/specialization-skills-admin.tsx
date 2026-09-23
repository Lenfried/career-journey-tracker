import {
  IMPORTANCES,
  SKILL_CATEGORIES,
  type CareerSpecialization,
} from '@/lib/canonical'
import { IMPORTANCE_LABELS, SKILL_CATEGORY_LABELS } from '@/lib/labels'
import {
  addRequiredSkillAction,
  removeRequiredSkillAction,
} from '../../actions'
import { Field, FIELD_CLASS, SECONDARY_BUTTON_CLASS } from './form-field'

export function SpecializationSkillsAdmin({
  specialization,
}: {
  specialization: CareerSpecialization
}) {
  return (
    <section aria-labelledby="specialization-skills">
      <h2
        id="specialization-skills"
        className="text-lg font-semibold tracking-tight"
      >
        Required skills
      </h2>
      <p className="text-muted-foreground mt-1 mb-4 text-sm">
        These requirements follow students when they select this specialization.
      </p>

      {specialization.requiredSkills.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {specialization.requiredSkills.map((skill) => (
            <li key={skill.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{skill.name}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {SKILL_CATEGORY_LABELS[skill.category]} ·{' '}
                    {IMPORTANCE_LABELS[skill.importance]}
                  </p>
                </div>
                <form
                  action={removeRequiredSkillAction.bind(
                    null,
                    specialization.id,
                    skill.id,
                  )}
                >
                  <button
                    type="submit"
                    className="text-sm text-red-700 hover:underline dark:text-red-400"
                  >
                    Remove
                  </button>
                </form>
              </div>
              {skill.rationale ? (
                <p className="text-muted-foreground mt-3 text-sm">
                  {skill.rationale}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          No specialization-specific skills yet.
        </p>
      )}

      <details className="mt-4 max-w-2xl rounded-lg border">
        <summary className="hover:bg-muted/40 cursor-pointer list-none px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          Add a required skill
        </summary>
        <form
          action={addRequiredSkillAction.bind(null, specialization.id)}
          className="space-y-4 border-t p-4"
        >
          <Field label="Skill name">
            <input name="name" required className={FIELD_CLASS} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select name="category" className={FIELD_CLASS} required>
                {SKILL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {SKILL_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Importance">
              <select name="importance" className={FIELD_CLASS} required>
                {IMPORTANCES.map((importance) => (
                  <option key={importance} value={importance}>
                    {IMPORTANCE_LABELS[importance]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Rationale (optional)">
            <input name="rationale" className={FIELD_CLASS} />
          </Field>
          <button type="submit" className={SECONDARY_BUTTON_CLASS}>
            Add required skill
          </button>
        </form>
      </details>
    </section>
  )
}
