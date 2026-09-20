/**
 * The model client.
 *
 * This is the only module that talks to a model endpoint, and the endpoint is
 * always the York LiteLLM proxy. Student data must not leave campus, so there
 * is no provider argument and no way to construct a different base URL — it
 * comes from `lib/env.ts` and nowhere else.
 *
 * Two things live here:
 *
 *   1. `generateJson()` — ask the model for JSON, validate it against a Zod
 *      schema, and return a result rather than throwing. Models return prose
 *      wrapped around JSON, JSON wrapped in code fences, truncated JSON, and
 *      well-formed JSON with the wrong shape. All four are expected, none of
 *      them should reach a React component.
 *   2. The stub provider, for when no API key is configured.
 *
 * What this module does NOT do is decide what to send. Assembling and redacting
 * a payload is the calling feature's business; see
 * `src/features/summary/queries.ts`.
 */

import OpenAI from 'openai'
import type { z } from 'zod'
import { env, hasModelAccess } from './env'

/**
 * A model call that did not produce a valid object.
 *
 * Kept as a small closed set because the UI renders a different message for
 * each: an unreachable proxy is the advisor's IT problem, a schema failure is
 * ours.
 */
export type AiFailureReason =
  | 'no-model-configured'
  | 'request-failed'
  | 'timeout'
  | 'empty-response'
  | 'invalid-json'
  | 'schema-mismatch'

export type AiResult<T> =
  | { ok: true; data: T; model: string; attempts: number }
  | { ok: false; reason: AiFailureReason; detail: string }

export type GenerateJsonOptions<T> = {
  system: string
  user: string
  schema: z.ZodType<T>
  /** Overridden in tests. Defaults to the real proxy call. */
  complete?: CompletionFn
}

/**
 * The seam tests inject at.
 *
 * Tests supply a function returning canned strings, so nothing in the suite
 * needs the proxy, a key, or a network. Injection rather than module mocking
 * keeps the malformed-response cases readable — the test says what the model
 * "returned" on the line above the assertion.
 */
export type CompletionFn = (request: {
  system: string
  user: string
  /** Appended on the retry. Empty on the first attempt. */
  correction: string
}) => Promise<string>

const MAX_ATTEMPTS = 2

const CORRECTION =
  'Your previous response was not valid JSON matching the required schema. ' +
  'Respond with a single JSON object and nothing else. No prose, no markdown, ' +
  'no code fences.'

/**
 * Ask the model for a JSON object of a given shape.
 *
 * Retries once on a malformed or off-schema response. One retry, not three:
 * a model that fails the shape twice in a row is not going to find it on the
 * fourth attempt, and an advisor waiting on a page does not want to pay for the
 * discovery. Failures come back as values.
 */
export async function generateJson<T>({
  system,
  user,
  schema,
  complete = callLiteLlm,
}: GenerateJsonOptions<T>): Promise<AiResult<T>> {
  if (complete === callLiteLlm && !hasModelAccess()) {
    return {
      ok: false,
      reason: 'no-model-configured',
      detail: 'LITELLM_API_KEY is not set.',
    }
  }

  let lastFailure: AiResult<T> = {
    ok: false,
    reason: 'request-failed',
    detail: 'No attempt was made.',
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let raw: string

    try {
      raw = await complete({
        system,
        user,
        correction: attempt === 1 ? '' : CORRECTION,
      })
    } catch (error) {
      // Never echo the request. The request is the student's record.
      return {
        ok: false,
        reason: isAbort(error) ? 'timeout' : 'request-failed',
        detail: describeError(error),
      }
    }

    const parsed = parseJsonResponse(raw, schema)

    if (parsed.ok) {
      return {
        ok: true,
        data: parsed.data,
        model: env.LITELLM_MODEL,
        attempts: attempt,
      }
    }

    lastFailure = parsed
  }

  return lastFailure
}

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Pull a validated object out of whatever the model actually said.
 *
 * Exported and pure so the awkward cases can be tested directly rather than
 * through a mocked HTTP client. Every branch here corresponds to something a
 * model has really returned.
 */
export function parseJsonResponse<T>(
  raw: string,
  schema: z.ZodType<T>,
):
  | { ok: true; data: T }
  | { ok: false; reason: AiFailureReason; detail: string } {
  const candidate = extractJsonObject(raw)

  if (candidate === null) {
    return {
      ok: false,
      reason: raw.trim() === '' ? 'empty-response' : 'invalid-json',
      detail:
        raw.trim() === ''
          ? 'The model returned nothing.'
          : 'No JSON object found in the response.',
    }
  }

  let value: unknown

  try {
    value = JSON.parse(candidate)
  } catch (error) {
    return {
      ok: false,
      reason: 'invalid-json',
      detail: error instanceof Error ? error.message : 'Unparseable JSON.',
    }
  }

  const result = schema.safeParse(value)

  if (!result.success) {
    // Paths, not values. A schema failure message that quotes the offending
    // content would be quoting a summary of a student.
    return {
      ok: false,
      reason: 'schema-mismatch',
      detail: result.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.code}`)
        .join('; '),
    }
  }

  return { ok: true, data: result.data }
}

/**
 * The JSON object inside a response, or `null`.
 *
 * Handles the three shapes that turn up in practice: a bare object, an object
 * in a ```json fence, and an object with a sentence in front of it. The last is
 * why this scans for braces rather than trusting the response to start with
 * one — `json_object` response format is requested, but not every proxy
 * honours it, and this has to work when it does not.
 */
function extractJsonObject(raw: string): string | null {
  const withoutFences = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  if (withoutFences === '') return null

  const start = withoutFences.indexOf('{')
  const end = withoutFences.lastIndexOf('}')

  if (start === -1 || end === -1 || end < start) return null

  return withoutFences.slice(start, end + 1)
}

/* -------------------------------------------------------------------------- */
/* The proxy                                                                   */
/* -------------------------------------------------------------------------- */

let client: OpenAI | null = null

function getClient(): OpenAI {
  // Lazy, so importing this module in a test or on a page that never generates
  // anything does not construct a client or require a key.
  client ??= new OpenAI({
    baseURL: env.LITELLM_BASE_URL,
    apiKey: env.LITELLM_API_KEY ?? '',
    timeout: env.LITELLM_TIMEOUT_MS,
    maxRetries: 0, // Retries are handled above, where the schema is known.
  })

  return client
}

const callLiteLlm: CompletionFn = async ({ system, user, correction }) => {
  const response = await getClient().chat.completions.create({
    model: env.LITELLM_MODEL,
    // Low but not zero. This is an interpretive writing task and a regenerate
    // button that returns a byte-identical summary looks broken.
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: correction ? `${system}\n\n${correction}` : system,
      },
      { role: 'user', content: user },
    ],
  })

  return response.choices[0]?.message?.content ?? ''
}

function isAbort(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' ||
      error.name === 'APIConnectionTimeoutError' ||
      error.message.toLowerCase().includes('timeout'))
  )
}

function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return 'Unknown error.'
}
