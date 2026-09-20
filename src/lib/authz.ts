/**
 * Authorisation for Server Actions.
 *
 * Rule 1 in AGENTS.md: every mutation is wrapped in `authedAction(roles, fn)`,
 * because a bare Server Action is a public HTTP endpoint. That rule is marked
 * Phase 2 — "binds the moment the first Server Action is written". The advisor
 * summary feature writes the first one, so this file exists now.
 *
 * WHAT THIS DOES NOT DO YET
 * -------------------------
 * There is no authentication in this application, so there is no session to
 * check and no role to compare against. `authedAction()` currently calls
 * through. It is here so that the wrapper is in place at every call site from
 * the first action onwards, and Phase 2 fills in the body of one function
 * rather than hunting down actions that were written without it.
 *
 * That makes this a placeholder, and placeholders that look like security are
 * worse than no security at all — so:
 *
 *   - The application must not be deployed anywhere a real student record could
 *     reach it until this is implemented. That is already the standing
 *     constraint in AGENTS.md; this file does not relax it.
 *   - In production, every call logs a warning. If this ever runs somewhere
 *     real before it is finished, it should be noisy about it.
 *
 * PHASE 2 CHECKLIST for whoever implements this
 * ---------------------------------------------
 *   1. Resolve the session (Auth.js).
 *   2. Return a denied result — not a throw — when there is no session, so the
 *      UI can render "you are not signed in" rather than an error boundary.
 *   3. Check the session's role against `roles`.
 *   4. Call `writeAudit()` (rule 2) with the actor, the action name, and the
 *      student id. FERPA requires knowing who did what, when.
 *   5. Delete the warning below and this comment block.
 */

import { env } from './env'

/** Roles that may exist once authentication does. Not yet enforced. */
export const ROLES = ['faculty-advisor', 'career-advisor', 'admin'] as const

export type Role = (typeof ROLES)[number]

/**
 * The result of an action. A denied or failed action is a value, not an
 * exception: the caller renders a message, and an expected outcome should not
 * travel by way of the error boundary.
 */
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string }

let warned = false

/**
 * Wraps a Server Action in an authorisation check.
 *
 * Use it at the point of definition so the exported action is the wrapped one
 * and there is no unwrapped version for a caller to reach:
 *
 *     export const doThing = authedAction(['career-advisor'], async (id) => {
 *       ...
 *     })
 */
export function authedAction<Args extends unknown[], Result>(
  roles: readonly Role[],
  fn: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return async (...args: Args): Promise<Result> => {
    if (env.NODE_ENV === 'production' && !warned) {
      warned = true
      // No student identifiers here. This says the app is misconfigured, and
      // that is all it needs to say.
      console.warn(
        '[authz] Server Actions are running WITHOUT authentication. ' +
          `Roles declared but not enforced: ${roles.join(', ')}. ` +
          'This build must not be serving real student records.',
      )
    }

    return fn(...args)
  }
}
