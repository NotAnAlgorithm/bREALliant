import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Validator } from '@content/schemas/validators'
import type { Feedback } from '@content/schemas/feedback'

import { SpotTheFlaw } from './SpotTheFlaw'
import {
  evaluateProblemFromWidget,
  getAnswerFromWidgetState,
} from '../lib/feedback/feedback-engine'
import { runValidator } from '../lib/validators/run-validator'

const widget = {
  kind: 'spot_the_flaw' as const,
  props: {
    steps: [
      { id: 'p1', label: 'Let A be bounded above.' },
      { id: 'p2', label: 'So sup A exists.' },
      { id: 'p3', label: 'So sup A is in A.' },
      { id: 'p4', label: 'So sup A is the maximum.' },
    ],
  },
}

const validator: Validator = {
  type: 'set_match',
  engine: 'mathjs',
  accept: ['p3'],
}

const feedback: Feedback = {
  correct: 'Correct!',
  incorrect: [{ match: '*', message: 'Try again.' }],
}

describe('SpotTheFlaw', () => {
  it('renders all proof steps', () => {
    render(
      <SpotTheFlaw
        widget={widget}
        state={{ selectedId: '' }}
        onStateChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Let A be bounded above.')).toBeInTheDocument()
    expect(screen.getByText('So sup A is in A.')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(4)
  })

  it('reports the selected step id when clicked', async () => {
    const user = userEvent.setup()
    const onStateChange = vi.fn()

    render(
      <SpotTheFlaw
        widget={widget}
        state={{ selectedId: '' }}
        onStateChange={onStateChange}
      />,
    )

    await user.click(screen.getByText('So sup A is in A.'))

    expect(onStateChange).toHaveBeenCalledWith({ selectedId: 'p3' })
  })

  it('marks the selected step as checked', () => {
    render(
      <SpotTheFlaw
        widget={widget}
        state={{ selectedId: 'p3' }}
        onStateChange={vi.fn()}
      />,
    )

    const selected = screen.getByRole('radio', { checked: true })
    expect(selected).toHaveTextContent('So sup A is in A.')
  })

  it('grades a correct selection true and an incorrect one false', () => {
    const correctAnswer = getAnswerFromWidgetState('spot_the_flaw', {
      selectedId: 'p3',
    })
    expect(correctAnswer).toBe('p3')
    expect(runValidator(validator, correctAnswer)).toBe(true)
    expect(
      evaluateProblemFromWidget(validator, feedback, 'spot_the_flaw', {
        selectedId: 'p3',
      }).correct,
    ).toBe(true)

    expect(
      evaluateProblemFromWidget(validator, feedback, 'spot_the_flaw', {
        selectedId: 'p1',
      }).correct,
    ).toBe(false)
  })
})
