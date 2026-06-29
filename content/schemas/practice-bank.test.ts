import { describe, expect, it } from 'vitest'

import { validatePracticeBank, type QuizItem } from './index'

function item(overrides: Partial<QuizItem> = {}): Record<string, unknown> {
  return {
    id: 'c1',
    prompt: 'A curated problem',
    widget: { kind: 'multiple_choice', props: { choices: [] } },
    validator: { type: 'set_match', engine: 'mathjs', accept: ['a'] },
    feedback: { correct: 'yes', incorrect: [{ match: '*', message: 'no' }] },
    tags: ['compactness'],
    ...overrides,
  }
}

describe('practiceBankSchema', () => {
  it('accepts an empty bank', () => {
    const result = validatePracticeBank({ items: [] })
    expect(result.success).toBe(true)
  })

  it('defaults items to an empty array when omitted', () => {
    const result = validatePracticeBank({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.items).toEqual([])
  })

  it('accepts items carrying tags and a 1–3 difficulty', () => {
    const result = validatePracticeBank({
      items: [
        item({ difficulty: 1 }),
        item({ id: 'c2', tags: ['compactness', 'heine-borel'], difficulty: 3 }),
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a difficulty outside the 1–3 scale', () => {
    expect(validatePracticeBank({ items: [item({ difficulty: 0 })] }).success).toBe(
      false,
    )
    expect(validatePracticeBank({ items: [item({ difficulty: 4 })] }).success).toBe(
      false,
    )
  })

  it('rejects a non-integer difficulty', () => {
    expect(
      validatePracticeBank({ items: [item({ difficulty: 2.5 })] }).success,
    ).toBe(false)
  })
})
