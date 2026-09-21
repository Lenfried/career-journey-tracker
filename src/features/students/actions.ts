'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { addAdvisingNote } from '@/features/notes/mutations'
import { advisingNoteFormSchema } from '@/features/notes/schemas'
import { writeAudit } from '@/lib/audit'
import { authedAction } from '@/lib/authz'
import { loadDataset, saveDataset } from '@/lib/fixtures'
import { setStudentPathway } from './mutations'
import { pathwaySelectionSchema } from './schemas'

const ROLES = ['advisor', 'faculty', 'admin'] as const

export const recordPathwayDecisionAction = authedAction(
  ROLES,
  async (actor, studentId: string, formData: FormData) => {
    const pathway = pathwaySelectionSchema.safeParse(formData.get('pathway'))
    const note = advisingNoteFormSchema.safeParse(Object.fromEntries(formData))
    const base = `/students/${studentId}?tab=career-map`
    if (!pathway.success) {
      redirect(
        `${base}&error=${encodeURIComponent(pathway.error.issues[0]?.message ?? 'Invalid pathway.')}`,
      )
    }
    if (!note.success) {
      redirect(
        `${base}&error=${encodeURIComponent(note.error.issues[0]?.message ?? 'Invalid note.')}`,
      )
    }
    const dataset = loadDataset()
    const student = dataset.students.find((item) => item.id === studentId)
    if (!student) redirect('/students')
    let trackId: string | null = null
    let specializationId: string | null = null
    if (pathway.data.startsWith('track:')) {
      trackId = pathway.data.slice(6)
      if (!dataset.careerTracks.some((track) => track.id === trackId))
        redirect(base)
    } else if (pathway.data.startsWith('specialization:')) {
      specializationId = pathway.data.slice(15)
      const specialization = dataset.careerSpecializations.find(
        (item) => item.id === specializationId,
      )
      if (!specialization) redirect(base)
      trackId = specialization.trackId
    }
    if (!dataset.lookups.noteTypes.some((type) => type.id === note.data.typeId))
      redirect(base)
    const now = new Date().toISOString()
    const noteId = `note_${randomUUID()}`
    const updated = addAdvisingNote(
      setStudentPathway(student, trackId, specializationId, now),
      { id: noteId, ...note.data, recordedBy: actor.displayName },
      now,
    )
    saveDataset({
      ...dataset,
      students: dataset.students.map((item) =>
        item.id === studentId ? updated : item,
      ),
    })
    await writeAudit({
      actorId: actor.id,
      action: 'student.pathway.update',
      studentId,
      recordId: noteId,
    })
    revalidatePath(`/students/${studentId}`)
    revalidatePath('/students')
    redirect(base)
  },
)
