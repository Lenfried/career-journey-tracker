import { describe, expect, it } from 'vitest'
import type { AdvisingNote, StudentRecord } from '@/lib/canonical'
import {
  addAdvisingNote,
  removeAdvisingNote,
  updateAdvisingNote,
} from './mutations'

const note: AdvisingNote = {
  id: 'note_one',
  sessionDate: '2026-09-17',
  typeId: 'note_career',
  content: 'Original note.',
  followUpDate: null,
  recordedBy: 'Demo Advisor',
}
const student = {
  notes: [],
  updatedAt: '2026-01-01T00:00:00.000Z',
} as unknown as StudentRecord
const now = '2026-09-17T12:00:00.000Z'

describe('advising note mutations', () => {
  it('creates, edits, and deletes a note without mutating the input', () => {
    const created = addAdvisingNote(student, note, now)
    expect(created.notes).toEqual([note])
    expect(student.notes).toEqual([])

    const edited = updateAdvisingNote(
      created,
      note.id,
      { ...note, content: 'Updated note.' },
      now,
    )
    expect(edited.notes[0]?.content).toBe('Updated note.')
    expect(edited.notes[0]?.recordedBy).toBe('Demo Advisor')

    expect(removeAdvisingNote(edited, note.id, now).notes).toEqual([])
  })
})
