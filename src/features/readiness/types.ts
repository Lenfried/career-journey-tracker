// readiness — types

import type { ArtifactStatus } from '@/lib/canonical'

/** One row of the readiness checklist. */
export type ReadinessArtifactView = {
  typeId: string
  typeLabel: string
  status: ArtifactStatus
  statusLabel: string
  url: string | null
  advisorNotes: string | null
}

/**
 * The whole checklist.
 *
 * Always one row per artifact type, in lookup order, even for a student whose
 * record has no artifact rows at all. A checklist that renders three items for
 * one student and four for another is not a checklist.
 */
export type ReadinessView = {
  artifacts: ReadinessArtifactView[]
  /** How many are at `complete`. */
  completeCount: number
  total: number
  /**
   * 0–100, partial credit for partial progress: an artifact at `needs-review`
   * counts for more than one at `none`. This is a progress indicator for a
   * single student's checklist, not a score to rank students by — the canonical
   * schema has no readiness score and this must not become one by accident.
   */
  progressPercent: number
}
