'use server'

import { authedAction } from '@/lib/authz'
import { recordAdvisingUpdate } from '@/features/students/advising-update'
import type { AdvisingUpdateState } from '@/features/students/types'
import { updateActionProgress } from './progress'

export const recordActionProgress = authedAction(
  ['faculty-advisor', 'career-advisor', 'admin'],
  async (
    actor,
    studentId: string,
    actionId: string,
    _state: AdvisingUpdateState,
    formData: FormData,
  ) =>
    recordAdvisingUpdate(
      actor,
      studentId,
      formData,
      'student.progress.update',
      (dataset, student, now) =>
        updateActionProgress(
          dataset,
          student,
          actionId,
          Object.fromEntries(formData),
          String(formData.get('content') ?? '').trim(),
          actor.displayName,
          now,
        ),
    ),
)
