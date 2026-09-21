// goals — schemas

export { careerGoalSchema, goalConfidenceSchema } from '@/lib/canonical'

// Week 2 adds `updateCareerGoalSchema` here. When it does: the form built on it
// must label the `advisorNotes` field with `<AiVisibilityBadge />`, because that
// field is sent to a language model and no type-based filter can reach it. The
// reasoning is in `./actions.ts` and `docs/ai-summary.md`.
