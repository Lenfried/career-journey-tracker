/**
 * The data source.
 *
 * This is the ONLY module that knows where student data physically comes from.
 * Today that is `fixtures/students.json`. Tomorrow it might be a Navigate360
 * export, a CUNYFirst response, or Postgres. When that day comes, this file
 * changes and nothing above it does — that is the entire point of the
 * three-layer split (UI → `features/*​/queries.ts` → here).
 *
 * Nothing in `src/app/` or `src/features/*​/components/` may import this. Read
 * through a feature's `queries.ts` instead. A component that reaches past the
 * service layer has to be rewritten when the source changes, and that is the
 * failure mode this architecture exists to prevent.
 */

import rawDataset from '../../fixtures/students.json'
import {
  canonicalDatasetSchema,
  type CanonicalDataset,
  type CareerAction,
  type CareerMap,
  type CareerTrack,
  type StudentRecord,
} from './canonical'

let cached: CanonicalDataset | null = null

/**
 * The validated dataset. Parsed once per process — the fixture file cannot
 * change under a running server, so re-validating on every request would buy
 * nothing.
 *
 * Validating at all is deliberate: a hand-edited fixture with a typo'd field
 * should fail here with a path, not three layers up as `undefined is not an
 * object` inside a component.
 */
export function loadDataset(): CanonicalDataset {
  if (cached) return cached

  const result = canonicalDatasetSchema.safeParse(rawDataset)

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

  cached = result.data
  return cached
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

/** One career map by id, or `undefined` when it is unknown. */
export function loadCareerMap(id: string): CareerMap | undefined {
  return loadDataset().careerMaps.find((map) => map.id === id)
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
