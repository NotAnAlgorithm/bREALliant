import { describe, expect, it } from 'vitest'

import { evaluateProblem } from './feedback-engine'

const validator = {
  type: 'expression' as const,
  engine: 'mathjs' as const,
  accept: ['1'],
}

const feedback = {
  correct: 'Correct!',
  incorrect: [{ match: '*', message: 'Not quite — try again.' }],
}

describe('evaluateProblem', () => {
  it('returns correct feedback', () => {
    expect(evaluateProblem(validator, feedback, '1')).toEqual({
      correct: true,
      message: 'Correct!',
    })
  })

  it('returns incorrect feedback with hint', () => {
    expect(evaluateProblem(validator, feedback, '2')).toEqual({
      correct: false,
      message: 'Not quite — try again.',
    })
  })
})
