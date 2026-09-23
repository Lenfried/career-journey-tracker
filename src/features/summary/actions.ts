'use server'

// summary — actions
//
// A bare Server Action is a public HTTP endpoint. This one is wrapped in
// `authedAction()` from `lib/authz.ts`, which supplies the fictional development
// actor and blocks production until a real authenticated session replaces it.
//
// This is not a mutation of a student record. It writes to the summary cache
// only. It does, however, spend tokens against the campus proxy on request,
// which is reason enough for it to be an explicit action rather than something
// a page render can trigger — rule 6, and the reason the button exists.

import { revalidatePath } from 'next/cache'
import { generateJson } from '@/lib/ai'
import { writeAudit } from '@/lib/audit'
import { authedAction, type ActionResult } from '@/lib/authz'
import { writeSummary } from '@/lib/summary-store'
import {
  buildStubSummary,
  assembleSummaryInput,
  fingerprintInput,
  STUB_MODEL,
} from './queries'
import { buildUserPrompt, PROMPT_VERSION, SYSTEM_PROMPT } from './prompt'
import { advisorSummarySchema } from './schemas'

/**
 * Messages the advisor sees. Deliberately plain about whose problem each one
 * is, because "something went wrong" sends them to the wrong person.
 */
const FAILURE_MESSAGES: Record<string, string> = {
  'no-model-configured':
    'No model is configured, so a sample summary was generated instead.',
  'request-failed':
    'Could not reach the York LiteLLM proxy. Check that you are on the campus network, then try again.',
  timeout:
    'The model did not respond in time. Try again — long records sometimes need a second attempt.',
  'empty-response': 'The model returned an empty response. Try again.',
  'invalid-json':
    'The model returned a malformed response twice. Try again; if it keeps happening the prompt needs attention.',
  'schema-mismatch':
    'The model returned a response in an unexpected shape twice. Try again; if it keeps happening the prompt needs attention.',
}

/**
 * Generate and store a summary for one student.
 *
 * Only ever called from the Generate button. Never from a page render — rule 6,
 * and also the reason the result is cached at all: a summary that changed every
 * time someone opened the tab would not be something two advisors could discuss.
 */
export const generateSummary = authedAction(
  ['faculty-advisor', 'career-advisor', 'admin'],
  async (actor, studentId: string): Promise<ActionResult<{ stub: boolean }>> => {
    const input = await assembleSummaryInput(studentId)

    if (!input) {
      // No student id in the message. IDs are fine in logs; this string renders
      // in a browser and there is no reason for it to carry one.
      return { ok: false, error: 'That student could not be found.' }
    }

    await writeAudit({
      actorId: actor.id,
      action: 'student.summary.generate',
      studentId,
    })

    const fingerprint = fingerprintInput(input)
    const generatedAt = new Date().toISOString()

    const result = await generateJson({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(input),
      schema: advisorSummarySchema,
    })

    // No model configured is not an error — it is the off-campus path. Store a
    // stub so the feature is demonstrable, tagged so it can never be mistaken
    // for the real thing.
    if (!result.ok && result.reason === 'no-model-configured') {
      await writeSummary({
        studentId,
        generatedAt,
        model: STUB_MODEL,
        promptVersion: PROMPT_VERSION,
        inputFingerprint: fingerprint,
        summary: buildStubSummary(input),
      })

      revalidatePath(`/students/${studentId}`)
      return { ok: true, data: { stub: true } }
    }

    if (!result.ok) {
      // The reason and detail, never the payload. The payload is the student's
      // record and this line ends up in a server log.
      console.warn(
        `[summary] generation failed for student=${studentId} reason=${result.reason}: ${result.detail}`,
      )

      return {
        ok: false,
        error: FAILURE_MESSAGES[result.reason] ?? 'Generation failed.',
      }
    }

    await writeSummary({
      studentId,
      generatedAt,
      model: result.model,
      promptVersion: PROMPT_VERSION,
      inputFingerprint: fingerprint,
      summary: result.data,
    })

    revalidatePath(`/students/${studentId}`)
    return { ok: true, data: { stub: false } }
  },
)
