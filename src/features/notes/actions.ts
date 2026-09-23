'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { writeAudit } from '@/lib/audit'
import { authedAction } from '@/lib/authz'
import { loadDataset, saveDataset } from '@/lib/fixtures'
import {
  addAdvisingNote,
  removeAdvisingNote,
  updateAdvisingNote,
} from './mutations'
import { advisingNoteFormSchema } from './schemas'

const ROLES = ['faculty-advisor', 'career-advisor', 'admin'] as const
const notePath = (studentId: string, error?: string) =>
  `/students/${studentId}?tab=notes${error ? `&error=${encodeURIComponent(error)}` : ''}`

function parseNote(studentId: string, formData: FormData) {
  const result = advisingNoteFormSchema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    redirect(notePath(studentId, result.error.issues[0]?.message))
  }
  if (
    !loadDataset().lookups.noteTypes.some(
      (type) => type.id === result.data.typeId,
    )
  ) {
    redirect(notePath(studentId, 'That note type no longer exists.'))
  }
  return result.data
}

function saveStudent(
  studentId: string,
  update: (
    student: ReturnType<typeof loadDataset>['students'][number],
  ) => ReturnType<typeof loadDataset>['students'][number],
) {
  const dataset = loadDataset()
  const student = dataset.students.find((item) => item.id === studentId)
  if (!student) redirect('/students')
  const updated = update(student)
  saveDataset({
    ...dataset,
    students: dataset.students.map((item) =>
      item.id === studentId ? updated : item,
    ),
  })
}

export const createAdvisingNoteAction = authedAction(
  ROLES,
  async (actor, studentId: string, formData: FormData) => {
    const input = parseNote(studentId, formData)
    const noteId = `note_${randomUUID()}`
    saveStudent(studentId, (student) =>
      addAdvisingNote(
        student,
        { id: noteId, ...input, recordedBy: actor.displayName },
        new Date().toISOString(),
      ),
    )
    await writeAudit({
      actorId: actor.id,
      action: 'note.create',
      studentId,
      recordId: noteId,
    })
    revalidatePath(`/students/${studentId}`)
    redirect(notePath(studentId))
  },
)

export const updateAdvisingNoteAction = authedAction(
  ROLES,
  async (actor, studentId: string, noteId: string, formData: FormData) => {
    const input = parseNote(studentId, formData)
    saveStudent(studentId, (student) => {
      if (!student.notes.some((note) => note.id === noteId))
        redirect(notePath(studentId, 'That note no longer exists.'))
      return updateAdvisingNote(
        student,
        noteId,
        input,
        new Date().toISOString(),
      )
    })
    await writeAudit({
      actorId: actor.id,
      action: 'note.update',
      studentId,
      recordId: noteId,
    })
    revalidatePath(`/students/${studentId}`)
    redirect(notePath(studentId))
  },
)

export const deleteAdvisingNoteAction = authedAction(
  ROLES,
  async (actor, studentId: string, noteId: string) => {
    saveStudent(studentId, (student) => {
      if (!student.notes.some((note) => note.id === noteId))
        redirect(notePath(studentId, 'That note no longer exists.'))
      return removeAdvisingNote(student, noteId, new Date().toISOString())
    })
    await writeAudit({
      actorId: actor.id,
      action: 'note.delete',
      studentId,
      recordId: noteId,
    })
    revalidatePath(`/students/${studentId}`)
    redirect(notePath(studentId))
  },
)
