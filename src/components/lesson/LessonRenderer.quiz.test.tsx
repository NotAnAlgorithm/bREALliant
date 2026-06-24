import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { parseLesson } from '@content/schemas'

import { LessonRenderer } from './LessonRenderer'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    profile: null,
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}))

// A quiz step (two graded multiple-choice items) followed by a summary step, so
// the quiz is NOT the last step and the gated "Continue" button is exercised.
const quizLesson = parseLesson({
  lessonId: 'test-quiz',
  title: 'Quiz Test',
  steps: [
    {
      id: 'quiz1',
      type: 'quiz',
      items: [
        {
          id: 'q1',
          prompt: 'First question?',
          widget: {
            kind: 'multiple_choice',
            props: {
              choices: [
                { id: 'a', label: 'Wrong one' },
                { id: 'c', label: 'Right one' },
              ],
            },
          },
          validator: { type: 'set_match', engine: 'mathjs', accept: ['c'] },
          feedback: {
            correct: 'Correct first.',
            incorrect: [{ match: '*', message: 'Try again first.' }],
          },
        },
        {
          id: 'q2',
          prompt: 'Second question?',
          widget: {
            kind: 'multiple_choice',
            props: {
              choices: [
                { id: 'a', label: 'Bad answer' },
                { id: 'b', label: 'Good answer' },
              ],
            },
          },
          validator: { type: 'set_match', engine: 'mathjs', accept: ['b'] },
          feedback: {
            correct: 'Correct second.',
            incorrect: [{ match: '*', message: 'Try again second.' }],
          },
        },
      ],
    },
    {
      id: 'sum',
      type: 'summary',
      blocks: [{ type: 'text', content: 'All done summary.' }],
    },
  ],
})

function renderQuiz() {
  render(
    <MemoryRouter>
      <LessonRenderer lesson={quizLesson} />
    </MemoryRouter>,
  )
}

describe('LessonRenderer quiz flow', () => {
  it('grades each question, navigates between them, and gates Continue until all are correct', async () => {
    const user = userEvent.setup()
    renderQuiz()

    const continueButton = () => screen.getByRole('button', { name: 'Continue' })

    // Starts on the first question, Continue gated.
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument()
    expect(continueButton()).toBeDisabled()
    expect(
      screen.getByText('Answer all questions correctly to continue.'),
    ).toBeInTheDocument()

    // Answer question 1 correctly.
    await user.click(screen.getByText('Right one'))
    await user.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByRole('status')).toHaveTextContent('Correct first.')

    // Still gated — question 2 is unanswered.
    expect(continueButton()).toBeDisabled()

    // Advance to question 2.
    await user.click(screen.getByRole('button', { name: 'Next question' }))
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument()

    // Wrong answer first, then correct.
    await user.click(screen.getByText('Bad answer'))
    await user.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByRole('status')).toHaveTextContent('Try again second.')

    await user.click(screen.getByText('Good answer'))
    await user.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByRole('status')).toHaveTextContent('Correct second.')

    // Now Continue is enabled; advancing reaches the summary step.
    expect(continueButton()).toBeEnabled()
    await user.click(continueButton())

    expect(screen.getByText('All done summary.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Finish lesson' }),
    ).toBeInTheDocument()
  })
})
