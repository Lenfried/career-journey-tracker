import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { generateJson, parseJsonResponse, type CompletionFn } from './ai'

/**
 * Nothing here touches the network, the proxy, or an API key. The completion
 * function is injected, so each test says what the model "returned" on the line
 * above the assertion.
 *
 * Every malformed case below is something a model really does: fences around
 * the JSON, a sentence in front of it, a response cut off mid-object, and
 * well-formed JSON of the wrong shape.
 */

const schema = z.object({
  headline: z.string().min(1),
  items: z.array(z.string()).max(3),
})

const VALID = { headline: 'Ready for interviews', items: ['a', 'b'] }

function returning(...responses: string[]): CompletionFn {
  let call = 0
  return vi.fn(async () => responses[Math.min(call++, responses.length - 1)])
}

describe('parseJsonResponse', () => {
  it('accepts a bare JSON object', () => {
    const result = parseJsonResponse(JSON.stringify(VALID), schema)
    expect(result).toEqual({ ok: true, data: VALID })
  })

  it('accepts JSON wrapped in a markdown code fence', () => {
    const raw = '```json\n' + JSON.stringify(VALID) + '\n```'
    expect(parseJsonResponse(raw, schema)).toEqual({ ok: true, data: VALID })
  })

  it('accepts a fence with no language tag', () => {
    const raw = '```\n' + JSON.stringify(VALID) + '\n```'
    expect(parseJsonResponse(raw, schema)).toEqual({ ok: true, data: VALID })
  })

  it('accepts JSON with a sentence in front of it', () => {
    const raw = `Here is the summary you asked for:\n\n${JSON.stringify(VALID)}`
    expect(parseJsonResponse(raw, schema)).toEqual({ ok: true, data: VALID })
  })

  it('rejects an empty response as empty rather than malformed', () => {
    expect(parseJsonResponse('   ', schema)).toMatchObject({
      ok: false,
      reason: 'empty-response',
    })
  })

  it('rejects prose with no JSON in it', () => {
    expect(
      parseJsonResponse('I am unable to help with that request.', schema),
    ).toMatchObject({ ok: false, reason: 'invalid-json' })
  })

  it('rejects a response truncated mid-object', () => {
    const raw = '{"headline": "Ready for interviews", "items": ["a", "b"'
    expect(parseJsonResponse(raw, schema)).toMatchObject({
      ok: false,
      reason: 'invalid-json',
    })
  })

  it('rejects valid JSON of the wrong shape', () => {
    const raw = JSON.stringify({ headline: 'ok', items: 'not an array' })
    expect(parseJsonResponse(raw, schema)).toMatchObject({
      ok: false,
      reason: 'schema-mismatch',
    })
  })

  it('rejects valid JSON that breaks a constraint', () => {
    const raw = JSON.stringify({ headline: 'ok', items: ['a', 'b', 'c', 'd'] })
    expect(parseJsonResponse(raw, schema)).toMatchObject({
      ok: false,
      reason: 'schema-mismatch',
    })
  })

  it('rejects a JSON array where an object is required', () => {
    expect(parseJsonResponse('[1, 2, 3]', schema)).toMatchObject({ ok: false })
  })

  it('does not echo the response content in the failure detail', () => {
    // A schema failure message that quoted the offending content would be
    // quoting a summary of a student.
    const raw = JSON.stringify({ headline: 'ok', items: 'Amara Okonkwo' })
    const result = parseJsonResponse(raw, schema)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.detail).not.toContain('Amara Okonkwo')
  })
})

describe('generateJson', () => {
  it('returns the parsed object on a clean first attempt', async () => {
    const complete = returning(JSON.stringify(VALID))
    const result = await generateJson({
      system: 's',
      user: 'u',
      schema,
      complete,
    })

    expect(result).toMatchObject({ ok: true, data: VALID, attempts: 1 })
    expect(complete).toHaveBeenCalledTimes(1)
  })

  it('retries once on a malformed response and accepts the second', async () => {
    const complete = returning('not json at all', JSON.stringify(VALID))
    const result = await generateJson({
      system: 's',
      user: 'u',
      schema,
      complete,
    })

    expect(result).toMatchObject({ ok: true, data: VALID, attempts: 2 })
    expect(complete).toHaveBeenCalledTimes(2)
  })

  it('sends a correction on the retry and not on the first attempt', async () => {
    const complete = returning('nope', JSON.stringify(VALID))
    await generateJson({ system: 's', user: 'u', schema, complete })

    expect(complete).toHaveBeenNthCalledWith(1, {
      system: 's',
      user: 'u',
      correction: '',
    })
    expect(complete).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ correction: expect.stringContaining('JSON') }),
    )
  })

  it('gives up after two attempts rather than retrying forever', async () => {
    const complete = returning('nope', 'still nope', JSON.stringify(VALID))
    const result = await generateJson({
      system: 's',
      user: 'u',
      schema,
      complete,
    })

    expect(result).toMatchObject({ ok: false, reason: 'invalid-json' })
    expect(complete).toHaveBeenCalledTimes(2)
  })

  it('reports a schema mismatch after two off-shape responses', async () => {
    const wrongShape = JSON.stringify({ headline: 'ok' })
    const result = await generateJson({
      system: 's',
      user: 'u',
      schema,
      complete: returning(wrongShape, wrongShape),
    })

    expect(result).toMatchObject({ ok: false, reason: 'schema-mismatch' })
  })

  it('returns a failure rather than throwing when the request throws', async () => {
    const result = await generateJson({
      system: 's',
      user: 'u',
      schema,
      complete: async () => {
        throw new Error('connect ECONNREFUSED')
      },
    })

    expect(result).toMatchObject({ ok: false, reason: 'request-failed' })
  })

  it('distinguishes a timeout from a failed request', async () => {
    const result = await generateJson({
      system: 's',
      user: 'u',
      schema,
      complete: async () => {
        const error = new Error('Request timed out.')
        error.name = 'APIConnectionTimeoutError'
        throw error
      },
    })

    expect(result).toMatchObject({ ok: false, reason: 'timeout' })
  })

  it('does not retry a thrown request error', async () => {
    // A retry here would double the wait an advisor is already sitting through
    // for something the second attempt cannot fix.
    const complete = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED')
    })

    await generateJson({ system: 's', user: 'u', schema, complete })
    expect(complete).toHaveBeenCalledTimes(1)
  })

  it('never puts the request content into a failure detail', async () => {
    const result = await generateJson({
      system: 'SYSTEM PROMPT',
      user: 'Student record: highly identifying content',
      schema,
      complete: async () => {
        throw new Error('connect ECONNREFUSED')
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.detail).not.toContain('identifying content')
      expect(result.detail).not.toContain('SYSTEM PROMPT')
    }
  })
})
