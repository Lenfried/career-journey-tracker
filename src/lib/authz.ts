import 'server-only'

import { env } from './env'

export const ROLES = ['faculty-advisor', 'career-advisor', 'admin'] as const

export type Role = (typeof ROLES)[number]
export type AppRole = Role
export type ActionActor = { id: string; displayName: string; role: Role }

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const FIXTURE_ACTOR: ActionActor = {
  id: 'demo_advisor',
  displayName: 'Demo Advisor',
  role: 'career-advisor',
}

/**
 * Resolves the temporary fixture-mode actor and checks its declared role.
 * Production access stays disabled until this API is backed by an Auth.js
 * session; a warning-only placeholder would make an unauthenticated action
 * reachable in a deployed build.
 */
export async function requireActor(
  roles: readonly Role[],
): Promise<ActionActor> {
  if (env.NODE_ENV === 'production') {
    throw new Error('Student record access is disabled without authentication.')
  }
  if (!roles.includes(FIXTURE_ACTOR.role)) throw new Error('Forbidden')
  return FIXTURE_ACTOR
}

/** Export only the wrapped action so every mutation has one authorization seam. */
export function authedAction<Args extends unknown[], Result>(
  roles: readonly Role[],
  handler: (actor: ActionActor, ...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return async (...args) => handler(await requireActor(roles), ...args)
}
