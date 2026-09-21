/**
 * Environment configuration, validated once at module load.
 *
 * Rule 4 in AGENTS.md: no secrets in code, everything through here. This file
 * exists as of the advisor summary feature, which is the first thing in the
 * codebase that needs a secret at all.
 *
 * Scope is deliberately narrow. Only the variables a Phase 1 code path actually
 * reads are validated. `DATABASE_URL`, `AUTH_SECRET` and friends are in
 * `.env.example` and are staged for Phase 2 — validating them here would make a
 * missing `.env` a startup failure, and the README promises that `npm install &&
 * npm run dev` works with no environment at all. Add them to this schema in the
 * commit that adds the code that reads them, not before.
 */

import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  /**
   * The York LiteLLM proxy. Student data must never reach a model endpoint
   * anywhere else, so this is a full URL rather than a provider name — there is
   * no code path that constructs a different one.
   */
  LITELLM_BASE_URL: z.url().default('https://llm.york.cuny.edu/v1'),

  /**
   * Absent is a supported state, not a misconfiguration.
   *
   * People work off campus and the proxy is not reachable from there. With no
   * key the summary feature runs a stub provider that returns obviously-fake
   * output rather than crashing the profile page. See `lib/ai.ts`.
   */
  LITELLM_API_KEY: z.string().min(1).optional(),

  LITELLM_MODEL: z.string().min(1).default('York-Coder'),

  /** Abort a generation that has not returned by this point, in milliseconds. */
  LITELLM_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
})

function loadEnv() {
  const result = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    LITELLM_BASE_URL: process.env.LITELLM_BASE_URL || undefined,
    LITELLM_API_KEY: process.env.LITELLM_API_KEY || undefined,
    LITELLM_MODEL: process.env.LITELLM_MODEL || undefined,
    LITELLM_TIMEOUT_MS: process.env.LITELLM_TIMEOUT_MS || undefined,
  })

  if (!result.success) {
    // Variable names and messages only. Never the values — this throws into a
    // stack trace and a stack trace ends up in a log.
    const issues = result.error.issues
      .map((issue) => `  ${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('\n')

    throw new Error(
      `Environment configuration is invalid:\n${issues}\n\nSee .env.example.`,
    )
  }

  return result.data
}

export const env = loadEnv()

export type Env = typeof env

/** Whether a real model endpoint is configured. `false` means stub mode. */
export function hasModelAccess(): boolean {
  return env.LITELLM_API_KEY !== undefined
}
