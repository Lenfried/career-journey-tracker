import { AiVisibilityBadge } from '@/components/ai-visibility-badge'
import { EmptyState } from '@/components/empty-state'
import type { Importance } from '@/lib/canonical'
import type { RequiredSkillView, SkillsView, StudentSkillView } from '../types'

const IMPORTANCE_STYLES: Record<Importance, string> = {
  'nice-to-have': 'bg-muted text-muted-foreground',
  important: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  essential: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300',
}

/**
 * MVP screen 5 — the two skill lists side by side, gap highlighted.
 *
 * The gap is the point of this screen, so it gets its own summary line rather
 * than leaving the advisor to diff two columns by eye.
 */
export function SkillsGapView({ skills }: { skills: SkillsView }) {
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

          {skills.skills.length === 0 ? (
            <EmptyState
              title="No skills recorded."
              hint="Usually means the skills inventory conversation has not happened yet, not that the student has none."
            />
          ) : (
            <ul className="divide-y overflow-hidden rounded-lg border">
              {skills.skills.map((skill) => (
                <StudentSkillRow key={skill.id} skill={skill} />
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

          {skills.requiredSkills.length === 0 ? (
            <EmptyState
              title="No target role skills recorded."
              hint="These are usually added once a career goal is set."
            />
          ) : (
            <ul className="divide-y overflow-hidden rounded-lg border">
              {skills.requiredSkills.map((skill) => (
                <RequiredSkillRow key={skill.id} skill={skill} />
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

function StudentSkillRow({ skill }: { skill: StudentSkillView }) {
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-medium">{skill.name}</span>
        <span className="text-muted-foreground text-xs">
          {skill.categoryLabel} · {skill.proficiencyLabel}
        </span>
        {skill.verifiedByAdvisor ? (
          <span
            className="text-xs text-emerald-700 dark:text-emerald-400"
            title="Verified by an advisor"
          >
            ✓ verified
          </span>
        ) : null}
        {skill.matchesRequirement ? (
          <span className="text-muted-foreground ml-auto text-xs">
            required for target role
          </span>
        ) : null}
      </div>
      {skill.evidence ? (
        <p className="text-muted-foreground mt-1 text-sm">{skill.evidence}</p>
      ) : null}
    </li>
  )
}

function RequiredSkillRow({ skill }: { skill: RequiredSkillView }) {
  return (
    <li
      className={
        skill.covered
          ? 'px-4 py-3'
          : 'bg-amber-50/40 px-4 py-3 dark:bg-amber-950/20'
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-medium">{skill.name}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${IMPORTANCE_STYLES[skill.importance]}`}
        >
          {skill.importanceLabel}
        </span>
        <span className="text-muted-foreground text-xs">
          {skill.categoryLabel}
        </span>
        <span
          className={`ml-auto text-xs ${
            skill.covered
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'font-medium text-amber-800 dark:text-amber-300'
          }`}
        >
          {skill.covered ? '✓ covered' : 'gap'}
        </span>
      </div>
      {skill.rationale ? (
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-muted-foreground text-sm">{skill.rationale}</p>
          {/* Lower risk than the goal notes — this describes the role, not the
              student — but it is still free text that reaches a model, and
              labelling only some of those teaches advisors the wrong rule. */}
          <AiVisibilityBadge />
        </div>
      ) : null}
    </li>
  )
}
