import { mkdtemp, readdir, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readSummary, writeSummary, type StoredSummary } from './summary-store'

/**
 * Exercises the real filesystem in a temporary directory rather than mocking
 * `node:fs`. The things worth testing here — a missing file, a corrupt file, an
 * id containing a path separator — are all filesystem behaviour, and a mock
 * would only assert that the mock was called.
 */

let workingDirectory: string
let previousCwd: string

beforeEach(async () => {
  previousCwd = process.cwd()
  workingDirectory = await mkdtemp(path.join(tmpdir(), 'cjt-summary-store-'))
  process.chdir(workingDirectory)
})

afterEach(async () => {
  process.chdir(previousCwd)
  await rm(workingDirectory, { recursive: true, force: true })
})

function summary(overrides: Partial<StoredSummary> = {}): StoredSummary {
  return {
    studentId: 'stu_okonkwo_amara',
    generatedAt: '2026-09-19T14:05:00.000Z',
    model: 'York-Coder',
    promptVersion: '2026-09-19.1',
    inputFingerprint: 'abc123def456',
    summary: { headline: 'Ready for interviews' },
    ...overrides,
  }
}

describe('summary store', () => {
  it('returns null when nothing has been stored', async () => {
    expect(await readSummary('stu_okonkwo_amara')).toBeNull()
  })

  it('round-trips a summary', async () => {
    const stored = summary()
    await writeSummary(stored)

    expect(await readSummary('stu_okonkwo_amara')).toEqual(stored)
  })

  it('creates the store directory on first write', async () => {
    await writeSummary(summary())

    const entries = await readdir(
      path.join(workingDirectory, '.cache', 'ai-summaries'),
    )
    expect(entries).toContain('stu_okonkwo_amara.json')
  })

  it('replaces a previous summary for the same student', async () => {
    await writeSummary(summary({ inputFingerprint: 'first' }))
    await writeSummary(summary({ inputFingerprint: 'second' }))

    const stored = await readSummary('stu_okonkwo_amara')
    expect(stored?.inputFingerprint).toBe('second')

    // And does not leave the temporary file behind.
    const entries = await readdir(
      path.join(workingDirectory, '.cache', 'ai-summaries'),
    )
    expect(entries).toEqual(['stu_okonkwo_amara.json'])
  })

  it('keeps students apart', async () => {
    await writeSummary(summary({ studentId: 'stu_a', inputFingerprint: 'a' }))
    await writeSummary(summary({ studentId: 'stu_b', inputFingerprint: 'b' }))

    expect((await readSummary('stu_a'))?.inputFingerprint).toBe('a')
    expect((await readSummary('stu_b'))?.inputFingerprint).toBe('b')
  })

  it('returns null rather than throwing on a corrupt file', async () => {
    // The worst acceptable outcome for a broken cache is the empty state and a
    // Generate button. A cache that can 500 the page it speeds up is not worth
    // having.
    const directory = path.join(workingDirectory, '.cache', 'ai-summaries')
    await mkdir(directory, { recursive: true })
    await writeFile(
      path.join(directory, 'stu_broken.json'),
      '{ not json',
      'utf8',
    )

    expect(await readSummary('stu_broken')).toBeNull()
  })

  it('returns null on a file that no longer matches the stored shape', async () => {
    const directory = path.join(workingDirectory, '.cache', 'ai-summaries')
    await mkdir(directory, { recursive: true })
    await writeFile(
      path.join(directory, 'stu_old.json'),
      JSON.stringify({ studentId: 'stu_old' }),
      'utf8',
    )

    expect(await readSummary('stu_old')).toBeNull()
  })

  it('does not let a student id escape the store directory', async () => {
    // Fixture ids are tame. An id from a future import is whatever the source
    // supplied, and a path segment is not the place to find that out.
    await writeSummary(summary({ studentId: '../../escaped' }))

    const entries = await readdir(
      path.join(workingDirectory, '.cache', 'ai-summaries'),
    )
    expect(entries).toEqual(['..%2F..%2Fescaped.json'])
    expect((await readSummary('../../escaped'))?.studentId).toBe(
      '../../escaped',
    )
  })
})
