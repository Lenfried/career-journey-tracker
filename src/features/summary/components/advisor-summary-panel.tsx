import { EmptyState } from '@/components/empty-state'
import { GenerateSummaryButton } from './generate-summary-button'
import type { GeneratedSummaryView, SummaryView } from '../types'
import type { AdvisorSummary } from '../schemas'

const PRIORITY_STYLES = {
  high: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300',
  medium: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  low: 'bg-muted text-muted-foreground',
} as const

/**
 * The AI summary tab.
 *
 * A Server Component. The only client code on this tab is the button, so the
 * summary itself renders with no JavaScript at all.
 */
export function AdvisorSummaryPanel({ view }: { view: SummaryView }) {
  return (
    <div className="space-y-6">
      {view.generated ? (
        <GeneratedSummary
          studentId={view.studentId}
          generated={view.generated}
          withheldSensitiveCount={view.withheldSensitiveCount}
        />
      ) : (
        <NotYetGenerated view={view} />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Before anything has been generated                                          */
/* -------------------------------------------------------------------------- */

function NotYetGenerated({ view }: { view: SummaryView }) {
  return (
    <div className="space-y-6">
      <EmptyState
        title="No summary has been generated for this student."
        hint="A summary reads the career goal, skills, readiness artifacts, milestones and recent advising notes together, and writes up where the student stands with recommendations for your next meeting."
      />

      {/* What would be sent, shown before the advisor chooses to send it.
          Someone approving a model call should be able to see the terms first. */}
      <div className="text-muted-foreground bg-muted/40 space-y-2 rounded-lg border p-5 text-sm">
        <p className="text-foreground font-medium">What gets sent</p>
        <p>
          The student’s program, classification, goal, skills, readiness
          statuses, milestones and eligible advising notes are sent to the York
          LiteLLM proxy on campus. Their name, EMPLID, email, advisor and
          artifact links are not.
        </p>
        {view.withheldSensitiveCount > 0 ? (
          <p>
            {view.withheldSensitiveCount}{' '}
            {view.withheldSensitiveCount === 1 ? 'note is' : 'notes are'} of a
            type not eligible for AI processing and will not be sent.
          </p>
        ) : null}
        {view.isEmptyRecord ? (
          <p>
            This student’s record is currently empty, so the summary will say so
            and suggest what to gather.
          </p>
        ) : null}
      </div>

      {view.modelConfigured ? null : <NoModelNotice />}

      <GenerateSummaryButton
        studentId={view.studentId}
        label="Generate summary"
      />
    </div>
  )
}

function NoModelNotice() {
  return (
    <p className="rounded-lg border border-dashed border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
      <span className="font-semibold">No model is configured.</span> Generating
      will produce clearly-labelled sample output rather than a real summary.
      Set <code className="font-mono text-xs">LITELLM_API_KEY</code> and connect
      to the campus network for the real thing.
    </p>
  )
}

/* -------------------------------------------------------------------------- */
/* A generated summary                                                         */
/* -------------------------------------------------------------------------- */

function GeneratedSummary({
  studentId,
  generated,
  withheldSensitiveCount,
}: {
  studentId: string
  generated: GeneratedSummaryView
  withheldSensitiveCount: number
}) {
  const { summary, staleness } = generated

  return (
    <div className="space-y-6">
      {generated.isStub ? <StubBanner /> : null}
      {staleness.stale ? <StaleBanner detail={staleness.detail} /> : null}

      <article className="bg-card space-y-6 rounded-lg border p-6">
        <Disclaimer />

        <header>
          <h3 className="text-lg leading-snug font-semibold">
            {summary.headline}
          </h3>
          <p className="mt-3 leading-relaxed">{summary.standing}</p>
        </header>

        <Bullets title="Strengths" items={summary.strengths} />
        <Bullets title="Gaps" items={summary.gaps} />

        {summary.recommendations.length > 0 ? (
          <section>
            <SectionHeading>Recommendations</SectionHeading>
            <ol className="space-y-3">
              {summary.recommendations.map((recommendation, index) => (
                <li
                  key={`${recommendation.action}-${index}`}
                  className="rounded-md border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium">{recommendation.action}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_STYLES[recommendation.priority]}`}
                    >
                      {recommendation.priority}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {recommendation.rationale}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <Bullets title="Talking points" items={summary.talkingPoints} />
        <Bullets
          title="Missing from the record"
          items={summary.dataGaps}
          hint="Worth collecting before or during the meeting."
        />

        {isEntirelyEmpty(summary) ? (
          <p className="text-muted-foreground text-sm italic">
            The model returned no strengths, gaps or recommendations, which is
            the expected result for a record with nothing in it.
          </p>
        ) : null}

        <Provenance
          generated={generated}
          withheldSensitiveCount={withheldSensitiveCount}
        />
      </article>

      <GenerateSummaryButton
        studentId={studentId}
        label="Regenerate summary"
        variant="outline"
      />
    </div>
  )
}

/**
 * Not dismissible, not collapsible, and above the content rather than below it.
 *
 * An advisor may act on this, or paste it into a meeting record. The claim that
 * it was written by a model and has not been checked has to travel with it.
 */
function Disclaimer() {
  return (
    <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <span className="font-semibold">AI-generated.</span> Written by a language
      model from this student’s record. It can be wrong or miss context. Review
      it against the tabs before acting on it or repeating it to the student.
    </p>
  )
}

function StubBanner() {
  return (
    <p className="rounded-lg border-2 border-sky-400 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200">
      <span className="font-semibold tracking-wide">SAMPLE OUTPUT</span>
      <span className="mx-2 opacity-40">·</span>
      No model was configured when this was generated. The counts below are
      real; the writing is placeholder text and is not advice.
    </p>
  )
}

function StaleBanner({ detail }: { detail: string }) {
  return (
    <p className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <span className="font-semibold">Out of date.</span> {detail} Regenerate to
      bring it up to date.
    </p>
  )
}

function Provenance({
  generated,
  withheldSensitiveCount,
}: {
  generated: GeneratedSummaryView
  withheldSensitiveCount: number
}) {
  return (
    <footer className="text-muted-foreground space-y-1 border-t pt-4 text-xs">
      <p>
        Generated {generated.generatedAtLabel} · model{' '}
        <span className="font-mono">{generated.model}</span> · prompt{' '}
        <span className="font-mono">{generated.promptVersion}</span>
      </p>
      {withheldSensitiveCount > 0 ? (
        <p>
          {withheldSensitiveCount}{' '}
          {withheldSensitiveCount === 1
            ? 'advising note was'
            : 'advising notes were'}{' '}
          withheld from the model because{' '}
          {withheldSensitiveCount === 1 ? 'its type is' : 'their types are'} not
          eligible for AI processing. Read{' '}
          {withheldSensitiveCount === 1 ? 'it' : 'them'} on the Notes tab.
        </p>
      ) : null}
    </footer>
  )
}

/* -------------------------------------------------------------------------- */

function Bullets({
  title,
  items,
  hint,
}: {
  title: string
  items: string[]
  hint?: string
}) {
  if (items.length === 0) return null

  return (
    <section>
      <SectionHeading hint={hint}>{title}</SectionHeading>
      <ul className="marker:text-muted-foreground list-disc space-y-1.5 pl-5">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

function SectionHeading({
  children,
  hint,
}: {
  children: string
  hint?: string
}) {
  return (
    <div className="mb-2">
      <h4 className="text-sm font-semibold tracking-tight">{children}</h4>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  )
}

/** An empty record produces empty arrays everywhere but `dataGaps`. */
function isEntirelyEmpty(summary: AdvisorSummary): boolean {
  return (
    summary.strengths.length === 0 &&
    summary.gaps.length === 0 &&
    summary.recommendations.length === 0
  )
}
