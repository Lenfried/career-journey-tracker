import type { AdvisingNote, StudentRecord } from '@/lib/canonical'
import type { AdvisingNoteInput } from './schemas'

export function addAdvisingNote(
  student: StudentRecord,
  note: AdvisingNote,
  updatedAt: string,
): StudentRecord {
  return { ...student, notes: [...student.notes, note], updatedAt }
}

export function updateAdvisingNote(
  student: StudentRecord,
  noteId: string,
  input: AdvisingNoteInput,
  updatedAt: string,
): StudentRecord {
  return {
    ...student,
    notes: student.notes.map((note) =>
      note.id === noteId ? { ...note, ...input } : note,
    ),
    updatedAt,
  }
}

export function removeAdvisingNote(
  student: StudentRecord,
  noteId: string,
  updatedAt: string,
): StudentRecord {
  return {
    ...student,
    notes: student.notes.filter((note) => note.id !== noteId),
    updatedAt,
  }
}
