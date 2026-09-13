// readiness — queries

import {
  ARTIFACT_STATUSES,
  type LookupItem,
  type ReadinessArtifact,
} from '@/lib/canonical'
import { loadLookups, loadStudent } from '@/lib/fixtures'
import { ARTIFACT_STATUS_LABELS } from '@/lib/labels'
import type { ReadinessArtifactView, ReadinessView } from './types'

/** The four-item readiness checklist for a student. */
export async function getReadinessStatus(
  studentId: string,
): Promise<ReadinessView> {
  const artifactTypes = loadLookups().artifactTypes
  const student = loadStudent(studentId)

  return deriveReadinessView(artifactTypes, student?.artifacts ?? [])
}

/* -------------------------------------------------------------------------- */
/* Derivation                                                                  */
/* -------------------------------------------------------------------------- */

const BEST_STATUS_INDEX = ARTIFACT_STATUSES.length - 1

/**
 * Builds one row per artifact type, filling in `none` for types the record
 * does not mention.
 *
 * Records legitimately omit artifact rows — a student added last week has no
 * artifact history at all. Defaulting here rather than requiring every record
 * to carry four rows keeps the fixture file (and any future import) honest
 * about what it actually knows.
 */
export function deriveReadinessView(
  artifactTypes: LookupItem[],
  artifacts: ReadinessArtifact[],
): ReadinessView {
  const byType = new Map(artifacts.map((a) => [a.typeId, a]))

  const rows: ReadinessArtifactView[] = artifactTypes.map((type) => {
    const artifact = byType.get(type.id)
    const status = artifact?.status ?? 'none'

    return {
      typeId: type.id,
      typeLabel: type.label,
      status,
      statusLabel: ARTIFACT_STATUS_LABELS[status],
      url: artifact?.url ?? null,
      advisorNotes: artifact?.advisorNotes ?? null,
    }
  })

  const earned = rows.reduce(
    (sum, row) => sum + ARTIFACT_STATUSES.indexOf(row.status),
    0,
  )
  const possible = rows.length * BEST_STATUS_INDEX

  return {
    artifacts: rows,
    completeCount: rows.filter((row) => row.status === 'complete').length,
    total: rows.length,
    progressPercent: possible === 0 ? 0 : Math.round((earned / possible) * 100),
  }
}
