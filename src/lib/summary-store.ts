/**
 * Where generated advisor summaries are kept.
 *
 * This is the data source for one thing the fixture file does not hold, and it
 * has the same standing as `lib/fixtures.ts`: it is the ONLY module that knows
 * where summaries physically live, and nothing in `src/app/` or in any
 * `components/` directory may import it. Read through
 * `features/summary/queries.ts`.
 *
 * Today that is one JSON file per student under `.cache/ai-summaries/`.
 * Tomorrow it is the `career_summary` table from rule 6 in AGENTS.md. The
 * interface is two functions on purpose — `readSummary` and `writeSummary` — so
 * that swap is this file and nothing else.
 *
 * Why the disk and not a module-level Map: the dev server reloads modules on
 * every edit, and a summary that vanishes when you change a component is a
 * cache that cannot be evaluated. A file also lets you open
 * `.cache/ai-summaries/<id>.json` and read what the model actually produced
 * while you are tuning the prompt.
 *
 * The directory is gitignored. In fixture mode its contents are prose about
 * fictional students, but it is the shape of a FERPA-protected artifact and
 * should be treated as one out of habit — when this becomes a real table it
 * will be audit-logged on read (rule 2).
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { timestampSchema } from './canonical'

/**
 * Resolved per call rather than at module load, so a test can `process.chdir()`
 * into a temporary directory and exercise the real filesystem paths instead of
 * mocking `node:fs`.
 */
function storeDirectory(): string {
  return path.join(process.cwd(), '.cache', 'ai-summaries')
}

/**
 * A stored summary.
 *
 * `model` and `promptVersion` are rule 6's requirement: when the prompt changes
 * we have to be able to say which summaries came from which version.
 * `inputFingerprint` is how staleness is detected — see
 * `features/summary/queries.ts`.
 *
 * `summary` is typed loosely here because the store must not care about the
 * shape of what it is storing. The summary feature owns that schema and
 * validates on the way out; a store that knows its payload's fields is a store
 * that needs editing every time the payload changes.
 */
export const storedSummarySchema = z.object({
  studentId: z.string().min(1),
  generatedAt: timestampSchema,
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  inputFingerprint: z.string().min(1),
  summary: z.unknown(),
})

export type StoredSummary = z.infer<typeof storedSummarySchema>

/**
 * The stored summary for a student, or `null`.
 *
 * A missing file, unreadable file, or file that no longer matches the stored
 * shape all return `null`. None of those is worth an error page: the worst case
 * is that the advisor sees the empty state and presses Generate. A cache that
 * can 500 the page it is meant to speed up is not worth having.
 */
export async function readSummary(
  studentId: string,
): Promise<StoredSummary | null> {
  let contents: string

  try {
    contents = await readFile(pathFor(studentId), 'utf8')
  } catch {
    return null
  }

  try {
    const result = storedSummarySchema.safeParse(JSON.parse(contents))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

/**
 * Store a summary, replacing any previous one for that student.
 *
 * Written to a temporary file and renamed, because `rename` is atomic on the
 * same filesystem. Writing in place means a reader arriving mid-write gets half
 * a JSON document, and two advisors opening the same profile is not an exotic
 * scenario in an advising office.
 */
export async function writeSummary(summary: StoredSummary): Promise<void> {
  await mkdir(storeDirectory(), { recursive: true })

  const target = pathFor(summary.studentId)
  const temporary = `${target}.${randomUUID()}.tmp`

  await writeFile(temporary, JSON.stringify(summary, null, 2), 'utf8')
  await rename(temporary, target)
}

/**
 * Student ids are opaque strings from whatever source supplied them, so they
 * are encoded rather than trusted as path segments. `stu_okonkwo_amara` is
 * harmless; an id containing `../` from a future import is not.
 */
function pathFor(studentId: string): string {
  return path.join(storeDirectory(), `${encodeURIComponent(studentId)}.json`)
}
