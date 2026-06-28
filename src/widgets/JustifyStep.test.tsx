import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Validator } from '@content/schemas/validators'
import type { Feedback } from '@content/schemas/feedback'

import { JustifyStep } from './JustifyStep'
import {
  evaluateProblemFromWidget,
  getAnswerFromWidgetState,
} from '../lib/feedback/feedback-engine'
import { runValidator } from '../lib/validators/run-validator'

const widget = {
  kind: 'justify_step' as const,
  props: {
    steps: [
      { id: 'st1', label: 'Case x^2 < 2 is impossible.' },
      { id: 'st2', label: 'Case x^2 > 2 is impossible.' },
      { id: 'st3', label: 'Therefore x^2 = 2.' },
    ],
    justifications: [
      { id: 'j_a', label: 'Not an upper bound.' },
      { id: 'j_b', label: 'Not the least upper bound.' },
      { id: 'j_c', label: 'Trichotomy.' },
    ],
  },
}

const emptyMatches = { matches: { st1: '', st2: '', st3: '' } }

const validator: Validator = {
  type: 'set_match',
  engine: 'mathjs',
  accept: ['st1:j_a,st2:j_b,st3:j_c'],
}

const feedback: Feedback = {
  correct: 'Correct!',
  incorrect: [{ match: '*', message: 'Try again.' }],
}

describe('JustifyStep', () => {
  it('renders one select per step', () => {
    render(
      <JustifyStep
        widget={widget}
        state={emptyMatches}
        onStateChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Case x^2 < 2 is impossible.')).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(3)
  })

  it('updates matches when a justification is selected', async () => {
    const user = userEvent.setup()
    const onStateChange = vi.fn()

    render(
      <JustifyStep
        widget={widget}
        state={emptyMatches}
        onStateChange={onStateChange}
      />,
    )

    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], 'j_a')

    expect(onStateChange).toHaveBeenCalledWith({
      matches: { st1: 'j_a', st2: '', st3: '' },
    })
  })

  it('encodes the answer as sorted stepId:justId pairs', () => {
    const answer = getAnswerFromWidgetState('justify_step', {
      matches: { st3: 'j_c', st1: 'j_a', st2: 'j_b' },
    })
    expect(answer).toBe('st1:j_a,st2:j_b,st3:j_c')
  })

  it('grades a correct matching true and an incorrect one false', () => {
    const correctAnswer = getAnswerFromWidgetState('justify_step', {
      matches: { st1: 'j_a', st2: 'j_b', st3: 'j_c' },
    })
    expect(runValidator(validator, correctAnswer)).toBe(true)
    expect(
      evaluateProblemFromWidget(validator, feedback, 'justify_step', {
        matches: { st1: 'j_a', st2: 'j_b', st3: 'j_c' },
      }).correct,
    ).toBe(true)

    expect(
      evaluateProblemFromWidget(validator, feedback, 'justify_step', {
        matches: { st1: 'j_b', st2: 'j_a', st3: 'j_c' },
      }).correct,
    ).toBe(false)
  })
})
