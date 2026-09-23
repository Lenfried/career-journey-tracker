import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import type { CanonicalDataset, StudentRecord } from '@/lib/canonical'
import type { ActionActor } from '@/lib/authz'
import { writeAudit } from '@/lib/audit'
import { loadDataset, saveDataset } from '@/lib/fixtures'
import { advisingNoteFormSchema } from '@/features/notes/schemas'
import type { AdvisingUpdateState } from './types'

import { AdvisingUpdateError } from './advising-update-error'

/** One fixture save commits the student edit and its session note together. */
export async function recordAdvisingUpdate(
  actor: ActionActor,
  studentId: string,
  formData: FormData,
  event: 'student.progress.update' | 'student.skill.update',
  update: (
    dataset: CanonicalDataset,
    student: StudentRecord,
    now: string,
  ) => {
    student: StudentRecord
    summary: string
    recordId: string
  },
): Promise<AdvisingUpdateState> {
  const note = advisingNoteFormSchema.safeParse(Object.fromEntries(formData))
  if (!note.success)
    return { error: note.error.issues[0]?.message ?? 'Check the session note.' }
  const dataset = loadDataset()
  const student = dataset.students.find((item) => item.id === studentId)
  if (!student) return { error: 'This student no longer exists.' }
  if (!dataset.lookups.noteTypes.some((type) => type.id === note.data.typeId)) {
    return { error: 'Choose an available note type.' }
  }
  const now = new Date().toISOString()
  let result: ReturnType<typeof update>
  try {
    result = update(dataset, student, now)
  } catch (error) {
    if (error instanceof AdvisingUpdateError) return { error: error.message }
    throw error
  }
  const updated = {
    ...result.student,
    updatedAt: now,
    notes: [
      ...student.notes,
      {
        ...note.data,
        id: `note_${randomUUID()}`,
        content: `${result.summary}\n\nReason: ${note.data.content}`,
        recordedBy: actor.displayName,
      },
    ],
  }
  saveDataset({
    ...dataset,
    students: dataset.students.map((item) =>
      item.id === studentId ? updated : item,
    ),
  })
  await writeAudit({
    actorId: actor.id,
    action: event,
    studentId,
    recordId: result.recordId,
  })
  revalidatePath(`/students/${studentId}`)
  revalidatePath('/students')
  revalidatePath('/')
  return {
    success: 'Saved with an advising note. You can review it on the Notes tab.',
  }
}
