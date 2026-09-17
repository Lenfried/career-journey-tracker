/**
 * The data source.
 *
 * This is the ONLY module that knows where student data physically comes from,
 * and the only one that knows how to persist a change to it. Today that is
 * `fixtures/students.json` on disk. Tomorrow it might be a Navigate360 export,
 * a CUNYFirst response, or Postgres. When that day comes, this file changes and
 * nothing above it does — that is the entire point of the three-layer split
 * (UI → `features/*​/queries.ts` or `features/*​/actions.ts` → here).
 *
 * Nothing in `src/app/` or `src/features/*​/components/` may import this. Read
 * or write through a feature's `queries.ts` / `actions.ts` instead. A component
 * that reaches past the service layer has to be rewritten when the source
 * changes, and that is the failure mode this architecture exists to prevent.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  canonicalDatasetSchema,
  type CanonicalDataset,
  type CareerAction,
  type CareerMap,
  type CareerTrack,
  type StudentRecord,
} from './canonical'

const FIXTURE_PATH = join(process.cwd(), 'fixtures', 'students.json')

let cached: CanonicalDataset | null = null

function parse(raw: unknown): CanonicalDataset {
  const result = canonicalDatasetSchema.safeParse(raw)

  if (!result.success) {
    // Paths and messages only. The fixture data is fictional so echoing values
    // would be harmless today, but a real adapter dropped in here would be
    // logging student PII into a stack trace. Keep the habit.
    const issues = result.error.issues
      .map((issue) => `  ${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('\n')

    throw new Error(
      `fixtures/students.json does not match the canonical schema:\n${issues}\n\n` +
        'See docs/canonical-schema.md.',
    )
  }

  return result.data
}

/**
 * The validated dataset, read from disk on first use and cached after that.
 *
 * The cache exists so the common case — every read in the process, which is
 * most of them — never touches disk or re-validates. It is invalidated by
 * `saveDataset()`, the only thing in this application that changes the file
 * out from under a running server. There is nothing else to invalidate it,
 * because there is nothing else that writes.
 */
export function loadDataset(): CanonicalDataset {
  if (cached) return cached

  cached = parse(JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')))
  return cached
}

/**
 * Writes a full dataset back to `fixtures/students.json` and updates the cache
 * to match — the only place this application persists an admin edit.
 *
 * Takes the whole dataset rather than a patch because every write today is
 * "the admin template changed": the catalog, the general map, or a track. A
 * caller builds the new dataset by spreading `loadDataset()` and replacing the
 * one array it changed, which keeps this function from needing to know which
 * slice moved.
 *
 * Validated before anything touches disk, same as a read — a form bug should
 * fail as a thrown error the admin screen can show, not as a fixture file that
 * no longer parses on the next request.
 */
export function saveDataset(dataset: CanonicalDataset): void {
  const validated = parse(dataset)
  writeFileSync(FIXTURE_PATH, JSON.stringify(validated, null, 2) + '\n')
  cached = validated
}

/** Every student record, in file order. */
export function loadStudents(): StudentRecord[] {
  return loadDataset().students
}

/** One student record, or `undefined` when the id is unknown. */
export function loadStudent(id: string): StudentRecord | undefined {
  return loadStudents().find((student) => student.id === id)
}

/** The lookup tables. */
export function loadLookups() {
  return loadDataset().lookups
}

/** The action catalog — every recommended action, defined once. */
export function loadCareerActions(): CareerAction[] {
  return loadDataset().careerActions
}

/** Every career map. There is one today, and everyone is on it. */
export function loadCareerMaps(): CareerMap[] {
  return loadDataset().careerMaps
}

/** One track by id, or `undefined`. A student with no track passes `null`. */
export function loadCareerTrack(id: string | null): CareerTrack | undefined {
  if (!id) return undefined
  return loadDataset().careerTracks.find((track) => track.id === id)
}

/** Every track, for the "switch track" picker. */
export function loadCareerTracks(): CareerTrack[] {
  return loadDataset().careerTracks
}
