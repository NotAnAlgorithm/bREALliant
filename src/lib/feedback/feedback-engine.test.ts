import { describe, expect, it } from 'vitest'

import {
  evaluateProblem,
  evaluateProblemFromWidget,
  getAnswerFromWidgetState,
} from './feedback-engine'

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

describe('getAnswerFromWidgetState', () => {
  it('reads the selected id for multiple_choice', () => {
    expect(getAnswerFromWidgetState('multiple_choice', { selectedId: 'c' })).toBe(
      'c',
    )
    expect(getAnswerFromWidgetState('multiple_choice', {})).toBe('')
  })

  it('encodes selected ids sorted and comma-joined for multiple_select', () => {
    expect(
      getAnswerFromWidgetState('multiple_select', { selectedIds: ['c', 'a'] }),
    ).toBe('a,c')
    expect(getAnswerFromWidgetState('multiple_select', {})).toBe('')
  })

  it('joins the order ids for drag_order', () => {
    expect(
      getAnswerFromWidgetState('drag_order', { order: ['1', '2', '3'] }),
    ).toBe('1,2,3')
    expect(getAnswerFromWidgetState('drag_order', {})).toBe('')
  })

  it('formats the active fraction for fraction_line', () => {
    expect(
      getAnswerFromWidgetState('fraction_line', { aNum: 3, aDen: 2 }),
    ).toBe('3/2')
    // Invalid (zero denominator) yields an empty answer.
    expect(
      getAnswerFromWidgetState('fraction_line', { aNum: 1, aDen: 0 }),
    ).toBe('')
  })

  it('formats num/den for rational_input', () => {
    expect(
      getAnswerFromWidgetState('rational_input', { num: '3', den: '4' }),
    ).toBe('3/4')
    expect(
      getAnswerFromWidgetState('rational_input', { num: '-3', den: '4' }),
    ).toBe('-3/4')
    // Zero denominator or empty fields yield an empty answer.
    expect(
      getAnswerFromWidgetState('rational_input', { num: '3', den: '0' }),
    ).toBe('')
    expect(getAnswerFromWidgetState('rational_input', {})).toBe('')
  })

  it('prefers the snapped fraction for number_line', () => {
    expect(
      getAnswerFromWidgetState('number_line', {
        markerPosition: 0.3333,
        markerFraction: '1/3',
      }),
    ).toBe('1/3')
    // Falls back to the numeric position when no fraction is present.
    expect(
      getAnswerFromWidgetState('number_line', { markerPosition: 5 }),
    ).toBe('5')
  })
})

describe('evaluateProblemFromWidget (quiz kinds)', () => {
  const setMatch = {
    type: 'set_match' as const,
    engine: 'mathjs' as const,
    accept: ['c'],
  }
  const mcFeedback = {
    correct: 'Right!',
    incorrect: [{ match: '*', message: 'Try again.' }],
  }

  it('grades a correct multiple_choice answer', () => {
    expect(
      evaluateProblemFromWidget(setMatch, mcFeedback, 'multiple_choice', {
        selectedId: 'c',
      }),
    ).toEqual({ correct: true, message: 'Right!' })
  })

  it('grades an incorrect multiple_choice answer', () => {
    expect(
      evaluateProblemFromWidget(setMatch, mcFeedback, 'multiple_choice', {
        selectedId: 'a',
      }),
    ).toEqual({ correct: false, message: 'Try again.' })
  })

  it('grades a 2-of-4 multiple_select answer regardless of click order', () => {
    const selectValidator = {
      type: 'set_match' as const,
      engine: 'mathjs' as const,
      accept: ['a,c'],
    }
    // Selection encodes to the canonical sorted string ("a,c") ...
    expect(
      getAnswerFromWidgetState('multiple_select', { selectedIds: ['c', 'a'] }),
    ).toBe('a,c')
    // ... and grades correctly regardless of the order ids were chosen in.
    expect(
      evaluateProblemFromWidget(selectValidator, mcFeedback, 'multiple_select', {
        selectedIds: ['c', 'a'],
      }),
    ).toEqual({ correct: true, message: 'Right!' })
    expect(
      evaluateProblemFromWidget(selectValidator, mcFeedback, 'multiple_select', {
        selectedIds: ['a', 'c'],
      }),
    ).toEqual({ correct: true, message: 'Right!' })
    // A different subset is graded incorrect.
    expect(
      evaluateProblemFromWidget(selectValidator, mcFeedback, 'multiple_select', {
        selectedIds: ['a', 'b'],
      }).correct,
    ).toBe(false)
  })

  it('grades a drag_order answer ignoring whitespace', () => {
    const orderValidator = {
      type: 'set_match' as const,
      engine: 'mathjs' as const,
      accept: ['1,2,3'],
    }
    expect(
      evaluateProblemFromWidget(orderValidator, mcFeedback, 'drag_order', {
        order: ['1', '2', '3'],
      }).correct,
    ).toBe(true)
  })
})
