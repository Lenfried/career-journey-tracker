import {
  CAREER_MAP_TERMS,
  IMPORTANCES,
  SKILL_CATEGORIES,
  type CareerAction,
  type CareerMap,
  type CareerTrack,
} from '@/lib/canonical'
import { CAREER_MAP_TERM_LABELS } from '@/lib/labels'
import { IMPORTANCE_LABELS, SKILL_CATEGORY_LABELS } from '@/lib/labels'
import {
  addRequiredSkillAction,
  removeRequiredSkillAction,
  updateCareerTrackDetailsAction,
  updateTrackOverlayAction,
} from '../../actions'
import {
  Field,
  FIELD_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from './form-field'

export function TrackEditorAdmin({
  track,
  generalMap,
  catalog,
  categoryLabel,
  studentCount,
}: {
  track: CareerTrack
  generalMap: CareerMap
  catalog: CareerAction[]
  categoryLabel: Map<string, string>
  studentCount: number
}) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Details</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          {studentCount} student{studentCount === 1 ? ' is' : 's are'} currently
          on this track.
        </p>
        <form
          action={updateCareerTrackDetailsAction.bind(null, track.id)}
          className="max-w-xl space-y-4 rounded-lg border p-4"
        >
          <Field label="Label">
            <input
              name="label"
              defaultValue={track.label}
              required
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Description">
            <textarea
              name="description"
              defaultValue={track.description}
              required
              rows={2}
              className={FIELD_CLASS}
            />
          </Field>
          <button type="submit" className={SECONDARY_BUTTON_CLASS}>
            Save details
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Overlay</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Every action starts at its general-map term. Move one into a different
          term for this track, or exclude it — the catalog entry itself only
          changes on the Action catalog page.
        </p>

        <form action={updateTrackOverlayAction.bind(null, track.id)}>
          <ul className="divide-y overflow-hidden rounded-lg border">
            {catalog.map((action) => {
              const placement = track.placements.find(
                (p) => p.actionId === action.id,
              )
              const excluded = track.excludes.includes(action.id)
              const generalTerm = generalMap.placements.find(
                (p) => p.actionId === action.id,
              )?.term

              const current = excluded
                ? 'excluded'
                : (placement?.term ?? 'default')

              return (
                <li
                  key={action.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{action.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {categoryLabel.get(action.categoryId) ??
                        action.categoryId}
                      {generalTerm
                        ? ` · general map: ${CAREER_MAP_TERM_LABELS[generalTerm]}`
                        : ' · not on the general map'}
                    </p>
                  </div>

                  <select
                    name={`override-${action.id}`}
                    defaultValue={current}
                    className={`${FIELD_CLASS} w-56 shrink-0`}
                  >
                    <option value="default">Same as general map</option>
                    {CAREER_MAP_TERMS.map((term) => (
                      <option key={term} value={term}>
                        Move to: {CAREER_MAP_TERM_LABELS[term]}
                      </option>
                    ))}
                    <option value="excluded">Excluded from this track</option>
                  </select>
                </li>
              )
            })}
          </ul>

          <button type="submit" className={`${PRIMARY_BUTTON_CLASS} mt-4`}>
            Save overlay
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Required skills
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          What this track asks a student to be able to do. Changes here follow a
          student the moment they switch onto this track.
        </p>

        {track.requiredSkills.length > 0 ? (
          <ul className="mb-4 divide-y overflow-hidden rounded-lg border">
            {track.requiredSkills.map((skill) => (
              <li
                key={skill.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{skill.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {SKILL_CATEGORY_LABELS[skill.category]} ·{' '}
                    {IMPORTANCE_LABELS[skill.importance]}
                    {skill.rationale ? ` · ${skill.rationale}` : ''}
                  </p>
                </div>
                <form
                  action={removeRequiredSkillAction.bind(
                    null,
                    track.id,
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
              </li>
            ))}
          </ul>
        ) : null}

        <form
          action={addRequiredSkillAction.bind(null, track.id)}
          className="max-w-xl space-y-4 rounded-lg border p-4"
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
      </section>
    </div>
  )
}
