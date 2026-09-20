// goals — actions
//
// Writes. Empty on purpose: Phase 1 is the read-only milestone, so there is
// nothing here yet. Planned for Week 2:
//
//   updateCareerGoal() — MVP screen 2
//
// WHEN YOU BUILD THE GOAL FORM, THE `advisorNotes` TEXTAREA NEEDS
// `<AiVisibilityBadge />` FROM `@/components/ai-visibility-badge`.
//
// That field is sent verbatim to a language model by the advisor summary
// feature. Advising notes are withheld by type — note types carry an
// `aiEligible` flag, so crisis and referral notes never leave — but
// `advisorNotes` is free text with no type, so no filter can reach it. The
// person typing is the only control, and a control nobody is told about is not
// a control. The read-only card in `components/career-goal-card.tsx` already
// carries the badge; the form is where it actually matters.
//
// See `docs/ai-summary.md`, "Residual risk worth knowing about".
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
