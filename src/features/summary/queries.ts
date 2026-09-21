// summary — queries
//
// Like `dashboard`, this feature owns no canonical data. It composes the other
// features' service-layer reads, which is why it imports from `features/*` and
// never from `lib/fixtures`. That is the whole reason the AI feature will not
// need rewriting when the data source becomes Postgres: it already reads
// through the same seam every screen does.
//
// The one thing it does own is the summary cache, and it reaches that through
// `lib/summary-store.ts` — the same arrangement, one module that knows where
// the data physically lives.

import { createHash } from 'node:crypto'
import { getStudentGoal } from '@/features/goals/queries'
import { getStudentMilestones } from '@/features/milestones/queries'
import {
  getFollowUpStatus,
  getStudentNotes,
  listAiEligibleNoteTypeIds,
} from '@/features/notes/queries'
import { getReadinessStatus } from '@/features/readiness/queries'
import { getStudentSkills } from '@/features/skills/queries'
import { getStudent } from '@/features/students/queries'
import { hasModelAccess } from '@/lib/env'
import { daysBetween, formatTimestamp, todayOnCampus } from '@/lib/dates'
import { readSummary } from '@/lib/summary-store'
import { PROMPT_VERSION } from './prompt'
import {
  advisorSummarySchema,
  type AdvisorSummary,
  type SummaryInput,
} from './schemas'
import type {
  GeneratedSummaryView,
  SummaryStaleness,
  SummaryView,
} from './types'

/**
 * The most recent eligible notes, and how much of each.
 *
 * Capped because a payload is not an archive. One fixture note already runs
 * past 800 characters and a real advising history will have longer ones; five
 * recent notes is what an advisor would skim before a meeting, which is the
 * standard this feature is held to.
 */
const MAX_NOTES = 5
const MAX_NOTE_CHARS = 1_200

/** Average days per month. Only ever used to produce a rounded "months ago". */
const DAYS_PER_MONTH = 30.44

/* -------------------------------------------------------------------------- */
/* Assembly                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Everything the model is allowed to see about a student.
 *
 * This function is the redaction boundary. What is absent matters more than
 * what is present:
 *
 *   - No `id`, `emplid`, `firstName`, `lastName`, `preferredName` or `email`.
 *     A model does not need to know who someone is to observe that their target
 *     role wants SQL and they do not have it.
 *   - No advisor name and no `recordedBy` on notes or milestones. Staff names
 *     are not needed to reason about readiness.
 *   - No `bio`. It is unstructured advisor context and could hold anything.
 *   - No artifact URLs. A portfolio or GitHub URL is very often the student's
 *     real name or handle, which would smuggle the identity back in through the
 *     one field nobody thinks to check.
 *   - No absolute dates. Relative integers instead, computed here, so the model
 *     has no date arithmetic to get wrong.
 *   - No notes whose type is not `aiEligible` — only a count of them.
 *
 * Every count and the skills gap are computed in code and handed over finished.
 * The model interprets; it does not recall or count.
 *
 * `today` is injectable so tests pin a date rather than drifting with the clock.
 */
export async function assembleSummaryInput(
  studentId: string,
  today: string = todayOnCampus(),
): Promise<SummaryInput | null> {
  const student = await getStudent(studentId)
  if (!student) return null

  const [goal, skills, readiness, notes, milestones, followUp, eligibleTypes] =
    await Promise.all([
      getStudentGoal(studentId),
      getStudentSkills(studentId),
      getReadinessStatus(studentId),
      getStudentNotes(studentId),
      getStudentMilestones(studentId),
      getFollowUpStatus(studentId),
      listAiEligibleNoteTypeIds(),
    ])

  // `getStudentNotes` returns most recent first, so the cap takes the recent
  // ones. The filter runs before the cap: five eligible notes, not five notes
  // of which some were dropped.
  const eligibleNotes = notes.filter((note) => eligibleTypes.has(note.typeId))
  const includedNotes = eligibleNotes.slice(0, MAX_NOTES)

  const milestoneItems = milestones.map((milestone) => ({
    type: milestone.typeLabel,
    title: milestone.title,
    description: milestone.description,
    monthsAgo: Math.max(
      0,
      Math.round(daysBetween(milestone.completedDate, today) / DAYS_PER_MONTH),
    ),
  }))

  const countByType: Record<string, number> = {}
  for (const milestone of milestoneItems) {
    countByType[milestone.type] = (countByType[milestone.type] ?? 0) + 1
  }

  return {
    isEmptyRecord:
      goal === null &&
      skills.skills.length === 0 &&
      skills.requiredSkills.length === 0 &&
      milestones.length === 0 &&
      includedNotes.length === 0 &&
      readiness.artifacts.every((artifact) => artifact.status === 'none'),

    context: {
      program: student.programLabel,
      classification: student.classificationLabel,
      enrollmentStatus: student.enrollmentStatusLabel,
    },

    goal: goal
      ? {
          statement: goal.statement,
          targetRole: goal.targetRole,
          targetIndustry: goal.targetIndustry,
          timeline: goal.timeline,
          confidence: goal.confidence,
          daysSinceLastDiscussed: goal.lastDiscussedAt
            ? daysBetween(
                // The instant's calendar date on campus, so "how long ago" is
                // counted in the same days the advising office counts in.
                todayOnCampus(new Date(goal.lastDiscussedAt)),
                today,
              )
            : null,
          advisorNotes: goal.advisorNotes,
        }
      : null,

    skills: {
      held: skills.skills.map((skill) => ({
        name: skill.name,
        category: skill.category,
        proficiency: skill.proficiency,
        verifiedByAdvisor: skill.verifiedByAdvisor,
      })),
      required: skills.requiredSkills.map((skill) => ({
        name: skill.name,
        importance: skill.importance,
        rationale: skill.rationale,
      })),
      gap: skills.gap.map((skill) => skill.name),
      coveredCount: skills.coveredCount,
      requiredCount: skills.requiredSkills.length,
    },

    readiness: {
      artifacts: readiness.artifacts.map((artifact) => ({
        type: artifact.typeLabel,
        status: artifact.statusLabel,
      })),
      completeCount: readiness.completeCount,
      total: readiness.total,
    },

    milestones: {
      items: milestoneItems,
      countByType,
      total: milestones.length,
    },

    notes: {
      items: includedNotes.map((note) => ({
        type: note.typeLabel,
        daysAgo: daysBetween(note.sessionDate, today),
        content: truncate(note.content, MAX_NOTE_CHARS),
      })),
      includedCount: includedNotes.length,
      withheldSensitiveCount: notes.length - eligibleNotes.length,
    },

    followUp: {
      overdue: followUp.overdue,
      daysOverdue: followUp.daysOverdue,
    },
  }
}

/* -------------------------------------------------------------------------- */
/* Staleness                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A fingerprint of the facts behind a payload.
 *
 * Stored with each summary and recompared on every read, so "stale" means
 * exactly "the model would see different facts now". That is a better test than
 * comparing `updatedAt`: `updatedAt` is student-level, it cannot distinguish a
 * change the payload saw from one it did not, and in fixture mode it never
 * moves at all, so a staleness feature built on it could not even be
 * demonstrated.
 *
 * Time-relative values are stripped before hashing. `daysAgo` on a note
 * increases every night; leaving it in would mark every summary in the system
 * stale each morning, which trains advisors to ignore the banner. What survives
 * is the record: the same notes, skills and milestones fingerprint the same
 * today and next week.
 *
 * `followUp.overdue` is kept even though it is time-driven, because it flips
 * once and the flip genuinely changes the briefing. `daysOverdue` is dropped —
 * it is the same fact, counted higher.
 *
 * Worth knowing: the payload carries a count of withheld sensitive notes, so
 * logging a crisis note does move the fingerprint and does mark the summary
 * stale, without that note's content ever entering the payload.
 */
export function fingerprintInput(input: SummaryInput): string {
  const stable = {
    isEmptyRecord: input.isEmptyRecord,
    context: input.context,
    goal: input.goal
      ? {
          statement: input.goal.statement,
          targetRole: input.goal.targetRole,
          targetIndustry: input.goal.targetIndustry,
          timeline: input.goal.timeline,
          confidence: input.goal.confidence,
          advisorNotes: input.goal.advisorNotes,
        }
      : null,
    skills: input.skills,
    readiness: input.readiness,
    milestones: {
      items: input.milestones.items.map((milestone) => ({
        type: milestone.type,
        title: milestone.title,
        description: milestone.description,
      })),
      countByType: input.milestones.countByType,
      total: input.milestones.total,
    },
    notes: {
      items: input.notes.items.map((note) => ({
        type: note.type,
        content: note.content,
      })),
      includedCount: input.notes.includedCount,
      withheldSensitiveCount: input.notes.withheldSensitiveCount,
    },
    followUp: { overdue: input.followUp.overdue },
  }

  // Key order is fixed by the literal above and the arrays arrive already
  // sorted from the feature queries, so `JSON.stringify` is deterministic here.
  return createHash('sha256')
    .update(JSON.stringify(stable))
    .digest('hex')
    .slice(0, 16)
}

/** Pure, so the two stale reasons can be tested without touching the store. */
export function deriveStaleness(
  storedFingerprint: string,
  storedPromptVersion: string,
  currentFingerprint: string,
  currentPromptVersion: string = PROMPT_VERSION,
): SummaryStaleness {
  // Record changes come first. If both moved, the data is the one that makes
  // the advice potentially wrong.
  if (storedFingerprint !== currentFingerprint) {
    return {
      stale: true,
      reason: 'record-changed',
      detail:
        'This student’s record has changed since this summary was written.',
    }
  }

  if (storedPromptVersion !== currentPromptVersion) {
    return {
      stale: true,
      reason: 'prompt-changed',
      detail: `Written with prompt ${storedPromptVersion}; the current prompt is ${currentPromptVersion}.`,
    }
  }

  return { stale: false }
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Everything the summary tab renders.
 *
 * The payload is re-assembled on every page load even when a summary exists —
 * that is what the fingerprint is compared against. It costs six in-memory
 * reads today and six indexed queries later, and it is the price of being able
 * to tell the advisor the summary is out of date. Nothing here calls a model.
 */
export async function getSummaryView(
  studentId: string,
): Promise<SummaryView | null> {
  const input = await assembleSummaryInput(studentId)
  if (!input) return null

  const base = {
    studentId,
    modelConfigured: hasModelAccess(),
    withheldSensitiveCount: input.notes.withheldSensitiveCount,
    isEmptyRecord: input.isEmptyRecord,
  }

  const stored = await readSummary(studentId)
  if (!stored) return { ...base, generated: null }

  // The stored summary is validated on the way out, not trusted because it was
  // validated on the way in. The file is on disk, a prompt change can alter the
  // shape, and a half-rendered summary is worse than the empty state.
  const parsed = advisorSummarySchema.safeParse(stored.summary)
  if (!parsed.success) return { ...base, generated: null }

  const generated: GeneratedSummaryView = {
    summary: parsed.data,
    generatedAt: stored.generatedAt,
    generatedAtLabel: formatTimestamp(stored.generatedAt),
    model: stored.model,
    promptVersion: stored.promptVersion,
    isStub: stored.model === STUB_MODEL,
    staleness: deriveStaleness(
      stored.inputFingerprint,
      stored.promptVersion,
      fingerprintInput(input),
    ),
  }

  return { ...base, generated }
}

/* -------------------------------------------------------------------------- */
/* Derivation                                                                  */
/* -------------------------------------------------------------------------- */

/** Recorded as the model name when the stub produced a summary. */
export const STUB_MODEL = 'stub'

/**
 * A summary for when no model endpoint is configured.
 *
 * Built from the real assembled payload, so every number in it is true — the
 * point is to exercise the whole feature off campus, and a stub that lied about
 * the counts would not do that. It is written to be unmistakable: flat,
 * mechanical sentences, and the UI puts a SAMPLE OUTPUT bar above it. The
 * stored record carries `model: 'stub'` so a placeholder can never be mistaken
 * for a generated summary after the fact.
 */
export function buildStubSummary(input: SummaryInput): AdvisorSummary {
  if (input.isEmptyRecord) {
    return {
      headline:
        'SAMPLE OUTPUT — no model configured. This student’s record is empty.',
      standing:
        'Sample text. Nothing has been recorded for this student: no career goal, no skills, no milestones and no advising notes eligible for summarising.',
      strengths: [],
      gaps: [],
      recommendations: [],
      talkingPoints: [],
      dataGaps: [
        'Sample text. A career goal, or a note that the student does not have one yet.',
        'Sample text. Any skills the student already has.',
        'Sample text. Whether a résumé exists in any form.',
      ],
    }
  }

  const gapCount = input.skills.gap.length

  return {
    headline: `SAMPLE OUTPUT — no model configured. ${input.milestones.total} milestone(s), ${input.readiness.completeCount} of ${input.readiness.total} readiness artifacts complete, ${gapCount} skill gap(s).`,
    standing: `Sample text generated without a model. The record holds ${input.skills.held.length} skill(s) against ${input.skills.requiredCount} the target role requires, ${input.milestones.total} milestone(s), and ${input.notes.includedCount} advising note(s) eligible for summarising. Set LITELLM_API_KEY to generate a real summary.`,
    strengths: input.skills.held
      .slice(0, 3)
      .map(
        (skill) => `Sample text. Has ${skill.name} at ${skill.proficiency}.`,
      ),
    gaps: input.skills.gap
      .slice(0, 3)
      .map((name) => `Sample text. Target role requires ${name}.`),
    recommendations: input.skills.gap.slice(0, 2).map((name) => ({
      action: `Sample text. Discuss building ${name}.`,
      rationale: `Sample text. ${name} appears in the target role's required skills and not in the student's.`,
      priority: 'medium' as const,
    })),
    talkingPoints: ['Sample text. This is placeholder output, not advice.'],
    dataGaps: input.goal
      ? []
      : ['Sample text. No career goal is recorded for this student.'],
  }
}

/* -------------------------------------------------------------------------- */

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit)}…[truncated]`
}
