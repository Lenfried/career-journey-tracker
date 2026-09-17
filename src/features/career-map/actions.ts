// career-map — actions
//
// Writes. Empty on purpose: Phase 1 is the read-only milestone, so there is
// nothing here yet. Planned for Week 2:
//
//   markCareerAction()  — an advisor confirms an action, waives it with a
//                         reason, or moves it back to in-progress
//   setCareerTrack()    — move a student to a different track
//   assignCareerMap()   — put a student on the map for the first time
//
// Three rules bind whatever lands here:
//
//   1. A bare Server Action is a public HTTP endpoint. Every mutation is
//      wrapped in `authedAction(roles, fn)` from `lib/authz.ts` once
//      authentication exists (Phase 2). Until then, this app must not be
//      deployed anywhere a student record could reach it.
//   2. Input is validated with the Zod schema from `./schemas.ts` — the same
//      schema the form resolver uses. One definition, both ends.
//   3. Completion is advisor-set. There is no student self-service path here,
//      and every progress row records `markedBy` and `markedAt` — FERPA means
//      knowing who said a thing was done, not just that it was.
//
// `setCareerTrack()` must not delete progress rows for actions the new track
// does not include. See `studentCareerMapSchema` in `lib/canonical.ts`: progress
// is keyed on action id precisely so a track change keeps what carries over.

export {}
