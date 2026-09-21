import { randomUUID } from 'node:crypto'
import { normaliseSkillName, type StudentRecord } from '@/lib/canonical'
import { AdvisingUpdateError } from '@/features/students/advising-update-error'
import { PROFICIENCY_LABELS, IMPORTANCE_LABELS } from '@/lib/labels'
import {
  studentSkillFormSchema,
  studentRequiredSkillFormSchema,
} from './schemas'

export type SkillList = 'held' | 'required'

export function updateStudentSkill(
  student: StudentRecord,
  list: SkillList,
  skillId: string | null,
  intent: string,
  values: unknown,
) {
  const rows = list === 'held' ? student.skills : student.requiredSkills
  const previous = rows.find((skill) => skill.id === skillId)
  if (skillId && !previous)
    throw new AdvisingUpdateError(
      'This student skill no longer exists. Shared specialization requirements must be edited in the admin area.',
    )
  if (intent === 'remove') {
    if (!previous)
      throw new AdvisingUpdateError(
        'Choose an existing student skill to remove.',
      )
    return {
      student:
        list === 'held'
          ? {
              ...student,
              skills: student.skills.filter((skill) => skill.id !== skillId),
            }
          : {
              ...student,
              requiredSkills: student.requiredSkills.filter(
                (skill) => skill.id !== skillId,
              ),
            },
      summary: `Removed ${list === 'held' ? 'recorded skill' : 'student requirement'}: ${previous.name}.`,
      recordId: previous.id,
    }
  }
  if (intent !== 'save') throw new AdvisingUpdateError('Choose Save or Remove.')
  const id = previous?.id ?? `skill_${randomUUID()}`
  if (list === 'held') {
    const parsed = studentSkillFormSchema.safeParse(values)
    if (!parsed.success)
      throw new AdvisingUpdateError(
        parsed.error.issues[0]?.message ?? 'Check the skill details.',
      )
    assertUniqueName(rows, parsed.data.name, id)
    const skill = { id, ...parsed.data }
    const before = student.skills.find((item) => item.id === id)
    return {
      student: {
        ...student,
        skills: previous
          ? student.skills.map((item) => (item.id === id ? skill : item))
          : [...student.skills, skill],
      },
      summary: `${before ? `Updated skill: ${before.name} (${PROFICIENCY_LABELS[before.proficiency]}) →` : 'Recorded skill:'} ${skill.name} (${PROFICIENCY_LABELS[skill.proficiency]}). Advisor verified: ${skill.verifiedByAdvisor ? 'yes' : 'no'}.`,
      recordId: id,
    }
  }
  const parsed = studentRequiredSkillFormSchema.safeParse(values)
  if (!parsed.success)
    throw new AdvisingUpdateError(
      parsed.error.issues[0]?.message ?? 'Check the requirement details.',
    )
  assertUniqueName(rows, parsed.data.name, id)
  const skill = { id, ...parsed.data }
  const before = student.requiredSkills.find((item) => item.id === id)
  return {
    student: {
      ...student,
      requiredSkills: previous
        ? student.requiredSkills.map((item) => (item.id === id ? skill : item))
        : [...student.requiredSkills, skill],
    },
    summary: `${before ? `Updated student requirement: ${before.name} (${IMPORTANCE_LABELS[before.importance]}) →` : 'Assigned student requirement:'} ${skill.name} (${IMPORTANCE_LABELS[skill.importance]}).`,
    recordId: id,
  }
}

function assertUniqueName(
  rows: { id: string; name: string }[],
  name: string,
  id: string,
) {
  if (
    rows.some(
      (skill) =>
        skill.id !== id &&
        normaliseSkillName(skill.name) === normaliseSkillName(name),
    )
  ) {
    throw new AdvisingUpdateError(
      'This skill is already listed. Open the existing skill to update it.',
    )
  }
}
