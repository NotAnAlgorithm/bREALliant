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

type ProblemStep = Extract<Step, { type: 'problem' }>

const problemStep: ProblemStep = {
  id: 'p1',
  type: 'problem',
  prompt: 'What is sup A?',
  widget: { kind: 'fill_blank', props: {} },
  validator: { type: 'expression', engine: 'mathjs', accept: ['sqrt(2)'] },
  feedback: {
    correct: 'Correct!',
    incorrect: [{ match: '*', message: 'Recall the lub property.' }],
  },
}

describe('StepRenderer hint controls (F6)', () => {
  it('shows a hint button only after an incorrect attempt when hints are enabled', () => {
    const { rerender } = render(
      <StepRenderer
        step={problemStep}
        widgetState={{ answer: '1' }}
        onWidgetStateChange={() => {}}
        onCheckAnswer={() => {}}
        hintsEnabled
        onRequestHint={() => {}}
        problemResult={null}
      />,
    )
    expect(
      screen.queryByRole('button', { name: /hint/i }),
    ).not.toBeInTheDocument()

    rerender(
      <StepRenderer
        step={problemStep}
        widgetState={{ answer: '1' }}
        onWidgetStateChange={() => {}}
        onCheckAnswer={() => {}}
        hintsEnabled
        onRequestHint={() => {}}
        problemResult={{ correct: false, message: 'Recall the lub property.' }}
      />,
    )
    expect(
      screen.getByRole('button', { name: /get a hint/i }),
    ).toBeInTheDocument()
  })

  it('renders a returned hint and invokes onRequestHint on click', async () => {
    const user = userEvent.setup()
    let calls = 0
    render(
      <StepRenderer
        step={problemStep}
        widgetState={{ answer: '1' }}
        onWidgetStateChange={() => {}}
        onCheckAnswer={() => {}}
        hintsEnabled
        hint="Think about upper bounds."
        onRequestHint={() => {
          calls += 1
        }}
        problemResult={{ correct: false, message: 'Recall the lub property.' }}
      />,
    )
    expect(screen.getByText('Think about upper bounds.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /another hint/i }))
    expect(calls).toBe(1)
  })

  it('does not show hint controls when the feature flag is off', () => {
    render(
      <StepRenderer
        step={problemStep}
        widgetState={{ answer: '1' }}
        onWidgetStateChange={() => {}}
        onCheckAnswer={() => {}}
        hintsEnabled={false}
        onRequestHint={() => {}}
        problemResult={{ correct: false, message: 'Recall the lub property.' }}
      />,
    )
    expect(
      screen.queryByRole('button', { name: /hint/i }),
    ).not.toBeInTheDocument()
  })
})

type WorkedExampleStep = Extract<Step, { type: 'worked_example' }>

const workedExampleStep: WorkedExampleStep = {
  id: 'we1',
  type: 'worked_example',
  prompt: 'Worked example: solve the inequality.',
  blocks: [{ type: 'text', content: 'First isolate n on one side.' }],
}

const scaffoldedProblem: ProblemStep = {
  ...problemStep,
  id: 'p2',
  workedExample: [{ type: 'text', content: 'Mirror the example: n > 100.' }],
  scaffold: 'worked',
}

const scaffoldedProblemMulti: ProblemStep = {
  ...problemStep,
  id: 'p3',
  workedExample: [
    { type: 'text', content: 'Step 1: rewrite the inequality as n > 100.' },
    { type: 'text', content: 'Step 2: the smallest such natural number is 101.' },
  ],
  scaffold: 'completion',
}

describe('StepRenderer worked examples (F4)', () => {
  it('renders a worked_example step', () => {
    render(
      <StepRenderer
        step={workedExampleStep}
        widgetState={{}}
        onWidgetStateChange={() => {}}
      />,
    )
    expect(screen.getByText('First isolate n on one side.')).toBeInTheDocument()
  })

  it('opens a problem worked example when the scaffold level is "worked"', () => {
    render(
      <StepRenderer
        step={scaffoldedProblem}
        widgetState={{ answer: '1' }}
        onWidgetStateChange={() => {}}
        onCheckAnswer={() => {}}
        scaffoldLevel="worked"
      />,
    )
    expect(screen.getByText('Mirror the example: n > 100.')).toBeInTheDocument()
  })

  it('shows all but the final step at the "completion" level', () => {
    render(
      <StepRenderer
        step={scaffoldedProblemMulti}
        widgetState={{ answer: '1' }}
        onWidgetStateChange={() => {}}
        onCheckAnswer={() => {}}
        scaffoldLevel="completion"
      />,
    )
    expect(
      screen.getByText('Step 1: rewrite the inequality as n > 100.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Step 2: the smallest such natural number is 101.'),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/final step is left for you/i)).toBeInTheDocument()
  })

  it('collapses the worked example when faded to "bare"', async () => {
    const user = userEvent.setup()
    render(
      <StepRenderer
        step={scaffoldedProblem}
        widgetState={{ answer: '1' }}
        onWidgetStateChange={() => {}}
        onCheckAnswer={() => {}}
        scaffoldLevel="bare"
      />,
    )
    expect(
      screen.queryByText('Mirror the example: n > 100.'),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /worked example/i }))
    expect(screen.getByText('Mirror the example: n > 100.')).toBeInTheDocument()
  })
})

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
