import 'server-only'

export type AppRole = 'advisor' | 'faculty' | 'admin'
export type ActionActor = { id: string; displayName: string; role: AppRole }

const FIXTURE_ACTOR: ActionActor = {
  id: 'demo_advisor',
  displayName: 'Demo Advisor',
  role: 'advisor',
}

/** Temporary fixture-mode identity. Real Auth.js sessions replace this API. */
export async function requireActor(
  roles: readonly AppRole[],
): Promise<ActionActor> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Student record access is disabled without authentication.')
  }
  if (!roles.includes(FIXTURE_ACTOR.role)) throw new Error('Forbidden')
  return FIXTURE_ACTOR
}

export function authedAction<Args extends unknown[], Result>(
  roles: readonly AppRole[],
  handler: (actor: ActionActor, ...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return async (...args) => handler(await requireActor(roles), ...args)
}
