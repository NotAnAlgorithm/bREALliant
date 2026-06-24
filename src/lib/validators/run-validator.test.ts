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

  describe('interval validator', () => {
    const intervalValidator = {
      type: 'interval' as const,
      engine: 'mathjs' as const,
      accept: ['1/3', '1/2'],
    }

    it('accepts a value strictly between the bounds', () => {
      expect(runValidator(intervalValidator, '5/12')).toBe(true)
      expect(runValidator(intervalValidator, '0.4')).toBe(true)
      expect(runValidator(intervalValidator, '2/5')).toBe(true)
    })

    it('rejects the endpoints (open interval)', () => {
      expect(runValidator(intervalValidator, '1/3')).toBe(false)
      expect(runValidator(intervalValidator, '1/2')).toBe(false)
    })

    it('rejects values outside the bounds', () => {
      expect(runValidator(intervalValidator, '1/4')).toBe(false)
      expect(runValidator(intervalValidator, '3/4')).toBe(false)
    })

    it('rejects non-numeric input', () => {
      expect(runValidator(intervalValidator, 'abc')).toBe(false)
    })
  })
})
