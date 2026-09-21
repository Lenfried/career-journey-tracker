import {
  SKILL_CATEGORIES,
  PROFICIENCIES,
  IMPORTANCES,
  type LookupItem,
  type StudentSkill,
  type RequiredSkill,
} from '@/lib/canonical'
import {
  SKILL_CATEGORY_LABELS,
  PROFICIENCY_LABELS,
  IMPORTANCE_LABELS,
} from '@/lib/labels'
import {
  SessionNoteFields,
  ADVISOR_FIELD_CLASS,
} from '@/features/notes/components/session-note-fields'
import { AdvisingUpdateForm } from '@/features/students/components/advising-update-form'
import { recordStudentSkill } from '../actions'
import type { SkillList } from '../mutations'

export type SkillEditorContext = {
  studentId: string
  noteTypes: LookupItem[]
  today: string
}

export function SkillEditor({
  context,
  list,
  skill,
  suggestion,
}: {
  context: SkillEditorContext
  list: SkillList
  skill?: StudentSkill | RequiredSkill
  suggestion?: Pick<StudentSkill, 'name' | 'category'>
}) {
  const held = skill && 'proficiency' in skill ? skill : undefined
  const required = skill && 'importance' in skill ? skill : undefined
  const save = recordStudentSkill.bind(
    null,
    context.studentId,
    list,
    skill?.id ?? null,
  )
  return (
    <div className="space-y-4 border-t p-4">
      <AdvisingUpdateForm
        action={save}
        submitLabel={
          list === 'held' ? 'Save skill and note' : 'Save requirement and note'
        }
      >
        <input type="hidden" name="intent" value="save" />
        <label className="block space-y-1 text-sm">
          <span>Skill name</span>
          <input
            name="name"
            defaultValue={skill?.name ?? suggestion?.name}
            required
            maxLength={200}
            className={ADVISOR_FIELD_CLASS}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>Category</span>
            <select
              name="category"
              defaultValue={
                skill?.category ?? suggestion?.category ?? 'technical'
              }
              className={ADVISOR_FIELD_CLASS}
            >
              {SKILL_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {SKILL_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>
          {list === 'held' ? (
            <label className="block space-y-1 text-sm">
              <span>Proficiency</span>
              <select
                name="proficiency"
                defaultValue={held?.proficiency ?? 'beginner'}
                className={ADVISOR_FIELD_CLASS}
              >
                {PROFICIENCIES.map((level) => (
                  <option key={level} value={level}>
                    {PROFICIENCY_LABELS[level]}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block space-y-1 text-sm">
              <span>Importance</span>
              <select
                name="importance"
                defaultValue={required?.importance ?? 'important'}
                className={ADVISOR_FIELD_CLASS}
              >
                {IMPORTANCES.map((level) => (
                  <option key={level} value={level}>
                    {IMPORTANCE_LABELS[level]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <label className="block space-y-1 text-sm">
          <span>
            {list === 'held'
              ? 'Evidence (optional)'
              : 'Requirement rationale (optional)'}
          </span>
          <textarea
            name={list === 'held' ? 'evidence' : 'rationale'}
            defaultValue={held?.evidence ?? required?.rationale ?? ''}
            maxLength={2000}
            rows={2}
            className={ADVISOR_FIELD_CLASS}
          />
        </label>
        {list === 'held' ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="verifiedByAdvisor"
              defaultChecked={held?.verifiedByAdvisor ?? false}
            />
            Verified by advisor
          </label>
        ) : null}
        <SessionNoteFields
          noteTypes={context.noteTypes}
          today={context.today}
        />
      </AdvisingUpdateForm>
      {skill ? (
        <details className="border-t pt-3">
          <summary className="text-destructive cursor-pointer text-sm">
            Remove this {list === 'held' ? 'skill' : 'requirement'}
          </summary>
          <div className="mt-3">
            <AdvisingUpdateForm
              action={save}
              submitLabel="Confirm removal and save note"
            >
              <input type="hidden" name="intent" value="remove" />
              <p className="text-muted-foreground text-sm">
                Removes this student’s entry. Previous advising notes remain.
                Removing a personal requirement can reveal a matching
                specialization requirement.
              </p>
              <SessionNoteFields
                noteTypes={context.noteTypes}
                today={context.today}
              />
            </AdvisingUpdateForm>
          </div>
        </details>
      ) : null}
    </div>
  )
}
