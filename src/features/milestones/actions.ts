// milestones — actions
//
// Writes. Empty on purpose: Phase 1 is the read-only milestone, so there is
// nothing here yet. Planned for Week 2:
//
//   saveMilestone() — MVP screen 4
//
// Two rules bind whatever lands here:
//
//   1. A bare Server Action is a public HTTP endpoint. Every mutation is
//      wrapped in `authedAction(roles, fn)` from `lib/authz.ts` once
//      authentication exists (Phase 2). Until then, this app must not be
//      deployed anywhere a student record could reach it.
//   2. Input is validated with the Zod schema from `./schemas.ts` — the same
//      schema the form resolver uses. One definition, both ends.

export {}
