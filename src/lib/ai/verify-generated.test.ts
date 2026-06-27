import { describe, expect, it } from 'vitest'

import type { QuizItem } from '@content/schemas'

import { verifyAll, verifyCandidate, type GeneratedCandidate } from './verify-generated'

function item(accept: string[]): QuizItem {
  return {
    id: 'g1',
    prompt: 'p',
    widget: { kind: 'fill_blank', props: {} },
    validator: { type: 'expression', engine: 'mathjs', accept },
    feedback: { correct: 'ok', incorrect: [{ match: '*', message: 'no' }] },
  }
}

const good: GeneratedCandidate = {
  tag: 'supremum',
  item: item(['7']),
  selfTestAnswer: '7',
}

describe('verifyCandidate', () => {
  it('passes an item whose validator accepts its known answer', () => {
    const verified = verifyCandidate(good)
    expect(verified).not.toBeNull()
    expect(verified?.tag).toBe('supremum')
  })

  it('rejects when the validator does NOT accept the self-test answer', () => {
    expect(verifyCandidate({ ...good, selfTestAnswer: '8' })).toBeNull()
  })

  it('rejects items without a validator', () => {
    const broken = { ...good.item, validator: undefined } as QuizItem
    expect(verifyCandidate({ ...good, item: broken })).toBeNull()
  })

  it('rejects an empty self-test answer', () => {
    expect(verifyCandidate({ ...good, selfTestAnswer: '   ' })).toBeNull()
  })

  it('rejects when a provided claimed answer does not validate', () => {
    expect(
      verifyCandidate({ ...good, claimedAnswer: '99' }),
    ).toBeNull()
  })

  it('verifyAll drops every unverifiable candidate', () => {
    const result = verifyAll([
      good,
      { ...good, selfTestAnswer: '8' },
      { ...good, item: item(['7']), selfTestAnswer: '7' },
    ])
    expect(result).toHaveLength(2)
  })
})
