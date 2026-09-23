import { describe, expect, it } from 'vitest'
import type { RequiredSkill, StudentSkill } from '@/lib/canonical'
import {
  deriveSkillsView,
  getStudentSkills,
  mergeRequiredSkills,
} from './queries'

function held(name: string): StudentSkill {
  return {
    id: `sk_${name}`,
    name,
    category: 'technical',
    proficiency: 'intermediate',
    evidence: null,
    verifiedByAdvisor: false,
  }
}

function required(
  name: string,
  importance: RequiredSkill['importance'] = 'important',
): RequiredSkill {
  return {
    id: `rq_${name}`,
    name,
    category: 'technical',
    importance,
    rationale: null,
  }
}

describe('deriveSkillsView', () => {
  it('matches skill names case-insensitively and ignoring stray whitespace', () => {
    // Free-text entry by two advisors on two days produces exactly this. If the
    // comparison were on raw strings, the gap display would tell an advisor to
    // teach a student something they already know.
    const view = deriveSkillsView(
      [held(' python '), held('Data Structures & Algorithms')],
      [required('Python'), required('data structures & algorithms')],
    )

    expect(view.gap).toHaveLength(0)
    expect(view.coveredCount).toBe(2)
    expect(view.requiredSkills.every((s) => s.covered)).toBe(true)
    expect(view.skills.every((s) => s.matchesRequirement)).toBe(true)
  })

  it('collapses runs of internal whitespace', () => {
    const view = deriveSkillsView(
      [held('machine  learning')],
      [required('Machine Learning')],
    )
    expect(view.gap).toHaveLength(0)
  })

  it('reports required skills the student does not have', () => {
    const view = deriveSkillsView(
      [held('Excel')],
      [required('SQL'), required('Python'), required('Excel')],
    )

    expect(view.gap.map((s) => s.name).sort()).toEqual(['Python', 'SQL'])
    expect(view.coveredCount).toBe(1)
  })

  it('orders required skills by importance, essential first', () => {
    const view = deriveSkillsView(
      [],
      [
        required('Nice', 'nice-to-have'),
        required('Vital', 'essential'),
        required('Useful', 'important'),
      ],
    )

    expect(view.requiredSkills.map((s) => s.name)).toEqual([
      'Vital',
      'Useful',
      'Nice',
    ])
  })

  it('trims the displayed name without changing what the advisor typed', () => {
    const view = deriveSkillsView([held('  Rust  ')], [])
    expect(view.skills[0].name).toBe('Rust')
  })

  it('handles both lists being empty', () => {
    const view = deriveSkillsView([], [])
    expect(view).toEqual({
      skills: [],
      requiredSkills: [],
      gap: [],
      coveredCount: 0,
    })
  })

  it('handles a student with skills but no target role', () => {
    const view = deriveSkillsView([held('C++')], [])
    expect(view.skills).toHaveLength(1)
    expect(view.skills[0].matchesRequirement).toBe(false)
    expect(view.gap).toHaveLength(0)
  })
})

describe('getStudentSkills', () => {
  it('reads the fixture student whose skills exercise normalisation', async () => {
    const view = await getStudentSkills('stu_al_rashid_zainab')

    // She holds "python" and "linear algebra"; the two lists capitalise them
    // differently. Every requirement she has a skill for still reads covered.
    for (const name of [
      'Python',
      'linear algebra',
      'PyTorch',
      'Technical writing',
    ]) {
      expect(view.requiredSkills.find((s) => s.name === name)?.covered).toBe(
        true,
      )
    }
    expect(view.skills.every((s) => s.matchesRequirement)).toBe(true)
  })

  it('raises the bar for a student in a specialization', async () => {
    const view = await getStudentSkills('stu_al_rashid_zainab')

    // Her specialization asks for things her own requirement list never mentioned, and
    // that is the point — the gap is against the path, not against a list an
    // advisor wrote once when the goal was set.
    expect(view.requiredSkills.some((s) => s.source === 'specialization')).toBe(
      true,
    )
    expect(view.gap).not.toHaveLength(0)
    expect(view.gap.every((s) => s.source === 'specialization')).toBe(true)
  })

  it('shows only the advisor\u2019s own requirements without a specialization', async () => {
    // Farrah wants security work and no security specialization exists yet.
    const view = await getStudentSkills('stu_benhamou_farrah')
    expect(view.requiredSkills).not.toHaveLength(0)
    expect(view.requiredSkills.every((s) => s.source === 'student')).toBe(true)
  })

  it('returns an empty view for an unknown student rather than throwing', async () => {
    const view = await getStudentSkills('stu_does_not_exist')
    expect(view.skills).toHaveLength(0)
    expect(view.requiredSkills).toHaveLength(0)
  })
})

describe('mergeRequiredSkills', () => {
  it('takes the specialization requirements and the advisor\u2019s together', () => {
    const merged = mergeRequiredSkills(
      [required('Probability'), required('C++')],
      [required('Public speaking')],
    )

    expect(merged.map((s) => s.name).sort()).toEqual([
      'C++',
      'Probability',
      'Public speaking',
    ])
    expect(merged.find((s) => s.name === 'C++')?.source).toBe('specialization')
    expect(merged.find((s) => s.name === 'Public speaking')?.source).toBe(
      'student',
    )
  })

  it('de-duplicates on the same rule the gap uses, advisor wins', () => {
    const fromSpecialization = {
      ...required('Python'),
      rationale: 'Specialization says so.',
    }
    const fromStudent = { ...required(' python '), rationale: 'For her lab.' }

    const merged = mergeRequiredSkills([fromSpecialization], [fromStudent])

    // One requirement, not two near-identical rows an advisor has to reconcile.
    expect(merged).toHaveLength(1)
    expect(merged[0].rationale).toBe('For her lab.')
    expect(merged[0].source).toBe('student')
  })

  it('handles either source having no requirements', () => {
    expect(mergeRequiredSkills([], [required('SQL')])).toHaveLength(1)
    expect(mergeRequiredSkills([required('SQL')], [])).toHaveLength(1)
    expect(mergeRequiredSkills([], [])).toHaveLength(0)
  })
})

describe('changing specialization', () => {
  const held_skills = [held('Python'), held('Git')]

  const swe = [required('Data Structures & Algorithms'), required('SQL')]
  const quant = [required('Probability'), required('C++')]
  const advisorAdded = [required('Public speaking')]

  it('swaps what the path requires and leaves the student\u2019s own alone', () => {
    const before = deriveSkillsView(
      held_skills,
      mergeRequiredSkills(swe, advisorAdded),
      'Software / backend engineering',
    )
    const after = deriveSkillsView(
      held_skills,
      mergeRequiredSkills(quant, advisorAdded),
      'Quantitative finance',
    )

    expect(before.requiredSkills.map((s) => s.name)).toContain('SQL')
    expect(after.requiredSkills.map((s) => s.name)).not.toContain('SQL')
    expect(after.requiredSkills.map((s) => s.name)).toContain('Probability')

    // The advisor's own requirement survives the switch, and so do the skills
    // the student actually has.
    for (const result of [before, after]) {
      expect(result.requiredSkills.map((s) => s.name)).toContain(
        'Public speaking',
      )
      expect(result.skills.map((s) => s.name)).toEqual(['Git', 'Python'])
    }
  })

  it('says where each requirement came from', () => {
    const result = deriveSkillsView(
      held_skills,
      mergeRequiredSkills(quant, advisorAdded),
      'Quantitative finance',
    )

    expect(
      result.requiredSkills.find((s) => s.name === 'C++')?.sourceLabel,
    ).toBe('Required by the Quantitative finance specialization')
    expect(
      result.requiredSkills.find((s) => s.name === 'Public speaking')
        ?.sourceLabel,
    ).toBe('Added by an advisor')
  })
})
