// summary — types

import type { AdvisorSummary } from './schemas'

/**
 * Why a stored summary no longer reflects the record.
 *
 * Two causes, kept apart because the advisor does something different about
 * each. A changed record means the advice may be wrong. A changed prompt means
 * the advice is fine but was written to an older brief.
 */
export type SummaryStaleness =
  | { stale: false }
  | {
      stale: true
      reason: 'record-changed' | 'prompt-changed'
      /** Rendered verbatim in the stale banner. */
      detail: string
    }

/** A summary that exists, ready to render. */
export type GeneratedSummaryView = {
  summary: AdvisorSummary
  generatedAt: string
  generatedAtLabel: string
  model: string
  promptVersion: string
  /**
   * True when this came from the stub provider rather than the proxy.
   *
   * Surfaced all the way to the UI on purpose. A placeholder summary that looks
   * like a real one is the single worst outcome this feature can produce.
   */
  isStub: boolean
  staleness: SummaryStaleness
}

/**
 * Everything the summary tab renders.
 *
 * `generated` is `null` before anyone has pressed the button. The surrounding
 * facts — whether a model is configured, how many notes were withheld, whether
 * the record is empty — are available without a summary, because the advisor
 * should be able to see what would be sent before choosing to send it.
 */
export type SummaryView = {
  studentId: string
  /** `false` puts the UI in stub mode before anything is generated. */
  modelConfigured: boolean
  /** Notes excluded from the payload because their type is not `aiEligible`. */
  withheldSensitiveCount: number
  isEmptyRecord: boolean
  generated: GeneratedSummaryView | null
}
