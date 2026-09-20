/**
 * Marks a free-text field whose contents are sent to a language model.
 *
 * WHY THIS EXISTS
 *
 * The advisor summary withholds sensitive advising notes by type: note types
 * carry an `aiEligible` flag, so crisis and referral notes are never sent. That
 * mechanism only works on data that has a type to hang the policy on.
 *
 * Two fields are free text with no type — the advisor's notes on a career goal,
 * and the rationale on a required skill. There is no category to filter, so the
 * choice is binary, and both are sent because they are the fields that make a
 * recommendation specific to the student rather than generic careers advice.
 *
 * Which leaves one protection: the person typing. This badge is that
 * protection. It goes next to every free-text field that reaches a model, so an
 * advisor writing one knows where it goes — at the moment they are writing it,
 * which is the only moment anybody actually knows whether what they are about
 * to type belongs in a career briefing.
 *
 * RULES
 *
 *   - Every free-text field included in `assembleSummaryInput()` carries this.
 *     Labelling some and not others is worse than labelling none: an advisor
 *     who sees the badge on one field reasonably concludes the unlabelled one
 *     is private.
 *   - It is one component so the wording cannot drift between the places it
 *     appears. Two wordings of the same promise is two promises.
 *   - When the Week 2 goal form is built, this goes on the textarea too. See
 *     `src/features/goals/actions.ts`.
 *
 * See `docs/ai-summary.md`.
 */
export function AiVisibilityBadge() {
  return (
    <span className="border-border text-muted-foreground inline-flex shrink-0 items-center rounded-full border border-dashed px-2 py-0.5 text-[0.6875rem] leading-none font-normal">
      Included in AI summaries
    </span>
  )
}
