import type { CanonicalDataset, StudentRecord } from '@/lib/canonical'
import { CAREER_ACTION_STATUS_LABELS } from '@/lib/labels'
import { AdvisingUpdateError } from '@/features/students/advising-update-error'
import { markCareerActionSchema } from './schemas'

export function updateActionProgress(
  dataset: CanonicalDataset,
  student: StudentRecord,
  actionId: string,
  values: unknown,
  reason: string,
  actor: string,
  now: string,
) {
  const parsed = markCareerActionSchema.safeParse(values)
  if (!parsed.success)
    throw new AdvisingUpdateError(
      'Choose a status and a nonnegative whole completed count.',
    )
  const action = dataset.careerActions.find((item) => item.id === actionId)
  if (!action) throw new AdvisingUpdateError('This action no longer exists.')
  const specialization = dataset.careerSpecializations.find(
    (item) => item.id === student.careerMap.specializationId,
  )
  const onGeneralMap = dataset.careerMaps[0]?.placements.some(
    (item) => item.actionId === actionId,
  )
  const onOverlay = specialization?.placements.some(
    (item) => item.actionId === actionId,
  )
  if (
    (!onGeneralMap && !onOverlay) ||
    specialization?.excludes.includes(actionId)
  ) {
    throw new AdvisingUpdateError(
      'This action is no longer on the student’s current map. Refresh the page.',
    )
  }
  const { status } = parsed.data
  const completedCount =
    status === 'done'
      ? action.targetCount
      : status === 'in-progress'
        ? parsed.data.completedCount
        : 0
  if (status === 'in-progress' && completedCount >= action.targetCount) {
    throw new AdvisingUpdateError(
      'Choose Done when the target count has been reached.',
    )
  }
  const previous = student.careerMap.progress.find(
    (item) => item.actionId === actionId,
  )
  const row = {
    actionId,
    status,
    completedCount,
    movedToTerm: previous?.movedToTerm ?? null,
    moveReasonId: previous?.moveReasonId ?? null,
    markedBy: actor,
    markedAt: now,
    note: reason,
  }
  return {
    student: {
      ...student,
      careerMap: {
        ...student.careerMap,
        progress: [
          ...student.careerMap.progress.filter(
            (item) => item.actionId !== actionId,
          ),
          row,
        ],
      },
    },
    summary: `Career action: ${action.title}\n${CAREER_ACTION_STATUS_LABELS[previous?.status ?? 'not-started']} (${previous?.completedCount ?? 0}/${action.targetCount}) → ${CAREER_ACTION_STATUS_LABELS[status]} (${completedCount}/${action.targetCount}).`,
    recordId: actionId,
  }
}
