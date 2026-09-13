/**
 * Resolving lookup ids to labels.
 *
 * Milestone types, note types, programs and artifact types are rows, not
 * TypeScript unions — adding a tenth milestone type must not require a deploy.
 * The cost of that is an indirection: records store `typeId`, screens need
 * "Internship". This is that indirection, in one place.
 */

import type { LookupItem } from './canonical'

/**
 * Label for `id`, falling back to the id itself.
 *
 * Falling back rather than throwing is deliberate. A record referencing a
 * retired lookup row is a data problem, not a reason for the roster to 500 —
 * the advisor sees `ms_internship` in a cell, which is ugly, legible, and
 * obviously reportable.
 */
export function resolveLabel(items: LookupItem[], id: string): string {
  return items.find((item) => item.id === id)?.label ?? id
}

/** Index for when you are resolving many ids against the same table. */
export function indexLookup(items: LookupItem[]): Map<string, string> {
  return new Map(items.map((item) => [item.id, item.label]))
}
