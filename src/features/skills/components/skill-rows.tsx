import type { Importance } from '@/lib/canonical'
import type { RequiredSkillView, StudentSkillView } from '../types'
import { SkillEditor, type SkillEditorContext } from './skill-editor'

const IMPORTANCE_STYLES: Record<Importance, string> = {
  'nice-to-have': 'bg-muted text-muted-foreground',
  important: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  essential: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300',
}

export function StudentSkillRow({
  skill,
  context,
}: {
  skill: StudentSkillView
  context: SkillEditorContext
}) {
  return (
    <li>
      <details>
        <summary className="hover:bg-muted/40 cursor-pointer px-4 py-3">
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
        </summary>
        {skill.evidence ? (
          <p className="text-muted-foreground px-4 pb-3 text-sm">
            {skill.evidence}
          </p>
        ) : null}
        <SkillEditor context={context} list="held" skill={skill} />
      </details>
    </li>
  )
}

export function RequiredSkillRow({
  skill,
  context,
}: {
  skill: RequiredSkillView
  context: SkillEditorContext
}) {
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
        <p className="text-muted-foreground mt-1 text-sm">{skill.rationale}</p>
      ) : null}
      {/* Where the requirement came from. Without this line a requirement
          appears or disappears when a student changes track and nothing on
          screen explains why. */}
      <p className="text-muted-foreground mt-1 text-xs">{skill.sourceLabel}</p>
      {!skill.covered ? (
        <details className="mt-3 rounded-md border">
          <summary className="hover:bg-muted/40 cursor-pointer p-3 text-sm">
            Record {skill.name} as a held skill
          </summary>
          <SkillEditor context={context} list="held" suggestion={skill} />
        </details>
      ) : null}
      {skill.source === 'student' ? (
        <details className="mt-3 rounded-md border">
          <summary className="hover:bg-muted/40 cursor-pointer p-3 text-sm">
            Edit requirement
          </summary>
          <SkillEditor context={context} list="required" skill={skill} />
        </details>
      ) : null}
    </li>
  )
}
