import { describe, expect, it } from 'vitest'
import type { RequiredSkill, StudentSkill } from '@/lib/canonical'
import { deriveSkillsView, getStudentSkills } from './queries'

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
    expect(view.gap).toHaveLength(0)
    expect(view.coveredCount).toBe(view.requiredSkills.length)
  })

  it('returns an empty view for an unknown student rather than throwing', async () => {
    const view = await getStudentSkills('stu_does_not_exist')
    expect(view.skills).toHaveLength(0)
    expect(view.requiredSkills).toHaveLength(0)
  })
})
