'use server'

import { authedAction } from '@/lib/authz'
import { recordAdvisingUpdate } from '@/features/students/advising-update'
import { AdvisingUpdateError } from '@/features/students/advising-update-error'
import type { AdvisingUpdateState } from '@/features/students/types'
import { updateStudentSkill, type SkillList } from './mutations'

export const recordStudentSkill = authedAction(
  ['faculty-advisor', 'career-advisor', 'admin'],
  async (
    actor,
    studentId: string,
    list: SkillList,
    skillId: string | null,
    _state: AdvisingUpdateState,
    formData: FormData,
  ) =>
    recordAdvisingUpdate(
      actor,
      studentId,
      formData,
      'student.skill.update',
      (_dataset, student) => {
        if (list !== 'held' && list !== 'required')
          throw new AdvisingUpdateError('Choose a valid skill list.')
        return updateStudentSkill(
          student,
          list,
          skillId,
          String(formData.get('intent')),
          Object.fromEntries(formData),
        )
      },
    ),
)
