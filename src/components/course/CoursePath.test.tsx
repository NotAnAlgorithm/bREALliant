import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MasteryStateValue } from '../../lib/database.types'
import { useCourseProgress } from '../../hooks/useCourseProgress'
import { CoursePath } from './CoursePath'

vi.mock('../../hooks/useCourseProgress')

const mockedUseCourseProgress = vi.mocked(useCourseProgress)

function setProgress(
  completed: string[] = [],
  inProgress: string[] = [],
  masteryByTag: Map<string, MasteryStateValue> = new Map(),
) {
  mockedUseCourseProgress.mockReturnValue({
    completedIds: new Set(completed),
    inProgressIds: new Set(inProgress),
    masteryByTag,
    mastery: [],
    loading: false,
    refresh: vi.fn(),
  })
}

function renderPath() {
  render(
    <MemoryRouter>
      <CoursePath />
    </MemoryRouter>,
  )
}

describe('CoursePath', () => {
  beforeEach(() => {
    mockedUseCourseProgress.mockReset()
  })

  it('shows the first lesson as ready and a dependent lesson as locked', () => {
    setProgress()
    renderPath()

    expect(
      screen.getByRole('button', {
        name: /The Rational Number System — Ready/,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Bounds and Suprema — Locked/ }),
    ).toBeInTheDocument()
  })

  it('unlocks a lesson once its prerequisite is completed', () => {
    setProgress(['lesson-bounds-01'])
    renderPath()

    expect(
      screen.getByRole('button', { name: /Bounds and Suprema — Completed/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /The Least Upper Bound Property — Ready/,
      }),
    ).toBeInTheDocument()
  })

  it('unlocks via retained mastery (no completion) and shows concept counts', () => {
    // All of lesson-bounds-01's concepts are retained, with no completion row.
    setProgress(
      [],
      [],
      new Map<string, MasteryStateValue>([
        ['bounds', 'retained'],
        ['supremum', 'fluent'],
        ['infimum', 'retained'],
      ]),
    )
    renderPath()

    // Mastered prerequisite reads as satisfied...
    expect(
      screen.getByRole('button', {
        name: /Bounds and Suprema — Completed/,
      }),
    ).toBeInTheDocument()
    // ...so the dependent lesson unlocks.
    expect(
      screen.getByRole('button', {
        name: /The Least Upper Bound Property — Ready/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/3\/3 concepts retained/)).toBeInTheDocument()
  })

  it('marks a started-but-locked lesson distinctly', () => {
    setProgress([], ['lesson-lub-01'])
    renderPath()

    expect(
      screen.getByRole('button', {
        name: /The Least Upper Bound Property — Locked · started/,
      }),
    ).toBeInTheDocument()
  })

  it('soft-gates a locked lesson with a confirmation dialog', async () => {
    const user = userEvent.setup()
    setProgress()
    renderPath()

    await user.click(
      screen.getByRole('button', {
        name: /The Least Upper Bound Property — Locked/,
      }),
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Skip the prerequisites?')
    // Missing prerequisite is listed by title.
    expect(dialog).toHaveTextContent('Bounds and Suprema')
    expect(
      screen.getByRole('button', { name: 'Continue anyway' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Go back' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
