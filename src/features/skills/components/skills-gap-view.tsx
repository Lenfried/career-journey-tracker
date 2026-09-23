import { EmptyState } from '@/components/empty-state'
import type { SkillsView } from '../types'
import { SkillEditor, type SkillEditorContext } from './skill-editor'
import { StudentSkillRow, RequiredSkillRow } from './skill-rows'

/**
 * MVP screen 5 — the two skill lists side by side, gap highlighted.
 *
 * The gap is the point of this screen, so it gets its own summary line rather
 * than leaving the advisor to diff two columns by eye.
 */
export function SkillsGapView({
  skills,
  context,
}: {
  skills: SkillsView
  context: SkillEditorContext
}) {
  return (
    <div className="space-y-6">
      <GapSummary skills={skills} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 font-medium">
            Skills the student has
            <span className="text-muted-foreground ml-2 text-sm font-normal tabular-nums">
              {skills.skills.length}
            </span>
          </h3>

          <details className="mb-4 rounded-lg border">
            <summary className="hover:bg-muted/40 cursor-pointer px-4 py-3 text-sm font-medium">
              Add a student skill
            </summary>
            <SkillEditor context={context} list="held" />
          </details>
          {skills.skills.length === 0 ? (
            <EmptyState
              title="No skills recorded."
              hint="Usually means the skills inventory conversation has not happened yet, not that the student has none."
            />
          ) : (
            <ul className="divide-y overflow-hidden rounded-lg border">
              {skills.skills.map((skill) => (
                <StudentSkillRow
                  key={skill.id}
                  skill={skill}
                  context={context}
                />
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-3 font-medium">
            Skills the role requires
            <span className="text-muted-foreground ml-2 text-sm font-normal tabular-nums">
              {skills.requiredSkills.length}
            </span>
          </h3>

          <details className="mb-4 rounded-lg border">
            <summary className="hover:bg-muted/40 cursor-pointer px-4 py-3 text-sm font-medium">
              Assign a required skill
            </summary>
            <SkillEditor context={context} list="required" />
          </details>
          {skills.requiredSkills.length === 0 ? (
            <EmptyState
              title="No target role skills recorded."
              hint="These are usually added once a career goal is set."
            />
          ) : (
            <ul className="divide-y overflow-hidden rounded-lg border">
              {skills.requiredSkills.map((skill) => (
                <RequiredSkillRow
                  key={skill.id}
                  skill={skill}
                  context={context}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function GapSummary({ skills }: { skills: SkillsView }) {
  const required = skills.requiredSkills.length

  if (required === 0) return null

  if (skills.gap.length === 0) {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        Every required skill is covered — {skills.coveredCount} of {required}.
        The work from here is depth, not breadth.
      </p>
    )
  }

  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <span className="font-medium">
        {skills.gap.length} of {required} required{' '}
        {required === 1 ? 'skill is' : 'skills are'} not yet covered
      </span>
      : {skills.gap.map((skill) => skill.name).join(', ')}.
    </p>
  )
}
