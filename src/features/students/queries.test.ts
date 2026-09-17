import { describe, expect, it } from 'vitest'
import {
  countStudents,
  getStudent,
  listRecentlyUpdatedStudents,
  listStudentRoster,
  listStudents,
} from './queries'

/** The fixture student with a preferred name — Antonia, who goes by Nia. */
const PREFERRED_NAME_STUDENT = 'stu_brightwater_antonia'

describe('listStudents', () => {
  it('returns every student, ordered by surname', async () => {
    const students = await listStudents()

    expect(students.length).toBe(await countStudents())
    expect(students.map((s) => s.sortableName)).toEqual(
      [...students.map((s) => s.sortableName)].sort((a, b) =>
        a.localeCompare(b),
      ),
    )
  })

  it('resolves the program lookup to a label', async () => {
    const students = await listStudents()
    expect(students.every((s) => !s.programLabel.startsWith('prog_'))).toBe(
      true,
    )
  })

  it('matches a search on the preferred name', async () => {
    const results = await listStudents({ search: 'nia' })
    expect(results.map((s) => s.id)).toContain(PREFERRED_NAME_STUDENT)
  })

  it('matches a search on the legal name', async () => {
    // An advisor arriving from a CUNYFirst screen has the legal name in front
    // of them, not the preferred one.
    const results = await listStudents({ search: 'Antonia' })
    expect(results.map((s) => s.id)).toContain(PREFERRED_NAME_STUDENT)
  })

  it('matches a search on EMPLID', async () => {
    const results = await listStudents({ search: '99000001' })
    expect(results).toHaveLength(1)
    expect(results[0].emplid).toBe('99000001')
  })

  it('is case-insensitive', async () => {
    const lower = await listStudents({ search: 'okonkwo' })
    const upper = await listStudents({ search: 'OKONKWO' })
    expect(lower.map((s) => s.id)).toEqual(upper.map((s) => s.id))
  })

  it('returns an empty list when nothing matches', async () => {
    expect(await listStudents({ search: 'zzzzzz' })).toEqual([])
  })
})

describe('listStudentRoster', () => {
  it('sorts classifications in academic order', async () => {
    const students = await listStudentRoster({ sort: 'classification' })
    const order = ['freshman', 'sophomore', 'junior', 'senior']
    const ranks = students.map((student) =>
      order.indexOf(student.classification),
    )

    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it('sorts entry terms chronologically rather than alphabetically', async () => {
    const students = await listStudentRoster({ sort: 'entry-term' })
    const rank = (code: string) => {
      const season = { SP: 0, SU: 1, FA: 2 }[
        code.slice(-2) as 'SP' | 'SU' | 'FA'
      ]
      return Number(code.slice(0, 4)) * 3 + season
    }
    const ranks = students.map((student) => rank(student.entryTerm))

    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it('sorts by specialization and keeps unselected students last', async () => {
    const students = await listStudentRoster({
      sort: 'specialization',
      direction: 'desc',
    })
    const labels = students
      .map((student) => student.specializationLabel)
      .filter((label): label is string => label !== null)

    expect(labels).toEqual([...labels].sort((a, b) => b.localeCompare(a)))
    expect(
      students
        .slice(labels.length)
        .every((student) => student.specializationLabel === null),
    ).toBe(true)
  })

  it('includes both taxonomy levels and the current career term', async () => {
    const students = await listStudentRoster()
    const amara = students.find((student) => student.id === 'stu_okonkwo_amara')

    expect(amara).toMatchObject({
      trackLabel: 'Software engineering',
      specializationLabel: 'Backend engineering',
      currentCareerTermLabel: expect.any(String),
    })
  })
})

describe('getStudent', () => {
  it('prefers the preferred name for display and keeps the legal name available', async () => {
    const student = await getStudent(PREFERRED_NAME_STUDENT)

    expect(student?.displayName).toBe('Nia Brightwater')
    expect(student?.sortableName).toBe('Brightwater, Nia')
    expect(student?.firstName).toBe('Antonia')
    expect(student?.preferredName).toBe('Nia')
  })

  it('falls back to the legal first name when there is no preferred name', async () => {
    const student = await getStudent('stu_okonkwo_amara')
    expect(student?.displayName).toBe('Amara Okonkwo')
    expect(student?.preferredName).toBeNull()
  })

  it('counts notes and milestones', async () => {
    const student = await getStudent('stu_nakamura_obi_theo')
    expect(student?.noteCount).toBe(1)
    expect(student?.milestoneCount).toBe(1)
  })

  it('returns null for an unknown id so the page can 404', async () => {
    expect(await getStudent('stu_does_not_exist')).toBeNull()
  })
})

describe('listRecentlyUpdatedStudents', () => {
  it('returns the most recently updated first, capped at the requested count', async () => {
    const students = await listRecentlyUpdatedStudents(5)

    expect(students).toHaveLength(5)
    expect(students.map((s) => s.updatedAt)).toEqual(
      [...students.map((s) => s.updatedAt)].sort().reverse(),
    )
  })
})
