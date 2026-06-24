import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { Step } from '@content/schemas'
import {
  evaluateProblemFromWidget,
  type EvaluationResult,
} from '../../lib/feedback/feedback-engine'
import { getInitialWidgetState, type WidgetState } from '../../widgets/types'
import { StepRenderer } from './StepRenderer'

type QuizStep = Extract<Step, { type: 'quiz' }>

const quizStep: QuizStep = {
  id: 's6',
  type: 'quiz',
  items: [
    {
      id: 'q1',
      prompt: 'Why did we invent ℚ?',
      widget: {
        kind: 'multiple_choice',
        props: {
          choices: [
            { id: 'a', label: 'To count apples' },
            { id: 'c', label: 'To allow division' },
          ],
        },
      },
      validator: { type: 'set_match', engine: 'mathjs', accept: ['c'] },
      feedback: {
        correct: 'Right — division is what ℚ adds.',
        incorrect: [{ match: '*', message: 'Think about division.' }],
      },
    },
  ],
}

// Harness that mirrors LessonRenderer's lifted state/result management so the
// one-at-a-time quiz UI has the props it needs to grade and gate.
function QuizHarness({ step }: { step: QuizStep }) {
  const [states, setStates] = useState<Record<string, WidgetState>>({})
  const [results, setResults] = useState<
    Record<string, EvaluationResult | null>
  >({})

  const itemState = (itemId: string): WidgetState => {
    const item = step.items.find((i) => i.id === itemId)!
    return getInitialWidgetState(item.widget, states[itemId])
  }

  return (
    <StepRenderer
      step={step}
      widgetState={{}}
      onWidgetStateChange={() => {}}
      quizItemState={itemState}
      quizItemResult={(itemId) => results[itemId] ?? null}
      onQuizItemStateChange={(itemId, state) => {
        setStates((prev) => ({ ...prev, [itemId]: state }))
        setResults((prev) => {
          const current = prev[itemId]
          if (!current || current.correct) return prev
          return { ...prev, [itemId]: null }
        })
      }}
      onCheckQuizItem={(itemId) => {
        const item = step.items.find((i) => i.id === itemId)!
        if (!item.validator || !item.feedback) return
        setResults((prev) => ({
          ...prev,
          [itemId]: evaluateProblemFromWidget(
            item.validator!,
            item.feedback!,
            item.widget.kind,
            itemState(itemId),
          ),
        }))
      }}
    />
  )
}

describe('StepRenderer quiz grading', () => {
  it('grades a correct multiple choice answer with instant feedback', async () => {
    const user = userEvent.setup()

    render(<QuizHarness step={quizStep} />)

    expect(screen.getByText(/Question 1 of 1/)).toBeInTheDocument()

    await user.click(screen.getByText('To allow division'))
    await user.click(screen.getByRole('button', { name: 'Check' }))

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(/Right — division/)
    expect(
      screen.queryByRole('button', { name: 'Check' }),
    ).not.toBeInTheDocument()
  })

  it('shows the incorrect hint and keeps the Check button', async () => {
    const user = userEvent.setup()

    render(<QuizHarness step={quizStep} />)

    await user.click(screen.getByText('To count apples'))
    await user.click(screen.getByRole('button', { name: 'Check' }))

    expect(screen.getByRole('status')).toHaveTextContent(/Think about division/)
    expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument()
  })
})
