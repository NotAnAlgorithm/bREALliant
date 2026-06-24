import { describe, expect, it } from 'vitest'

import { runValidator } from './run-validator'

describe('runValidator', () => {
  const expressionValidator = {
    type: 'expression' as const,
    engine: 'mathjs' as const,
    accept: ['1'],
  }

  it('accepts exact string match', () => {
    expect(runValidator(expressionValidator, '1')).toBe(true)
  })

  it('accepts numeric equivalent', () => {
    expect(runValidator(expressionValidator, '1.0')).toBe(true)
  })

  it('rejects wrong answer', () => {
    expect(runValidator(expressionValidator, '2')).toBe(false)
  })

  it('respects tolerance', () => {
    expect(
      runValidator(
        { ...expressionValidator, accept: ['1'], tolerance: 0.01 },
        '1.005',
      ),
    ).toBe(true)
  })
})
