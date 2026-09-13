// skills — schemas

export {
  studentSkillSchema,
  requiredSkillSchema,
  skillCategorySchema,
  proficiencySchema,
  importanceSchema,
} from '@/lib/canonical'

// Week 2 adds `addStudentSkillSchema` and `addRequiredSkillSchema` here. Both
// must normalise the name on the way in — `normaliseSkillName()` in
// `lib/canonical.ts`, the same function the gap derivation reads with. If write
// and read disagree on what counts as the same skill, the gap display lies.
