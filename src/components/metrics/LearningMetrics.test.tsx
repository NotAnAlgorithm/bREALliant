import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MasteryStateValue } from '../../lib/database.types'
import { useCourseProgress } from '../../hooks/useCourseProgress'
import { useDueReviews } from '../../hooks/useDueReviews'
import { useStreak } from '../../hooks/useStreak'
import { LearningMetrics } from './LearningMetrics'

vi.mock('../../hooks/useCourseProgress')
vi.mock('../../hooks/useDueReviews')
vi.mock('../../hooks/useStreak')

const mockedUseCourseProgress = vi.mocked(useCourseProgress)
const mockedUseDueReviews = vi.mocked(useDueReviews)
const mockedUseStreak = vi.mocked(useStreak)

function setup({
  mastery = new Map<string, MasteryStateValue>(),
  dueCount = 0,
  streak = 0,
}: {
  mastery?: Map<string, MasteryStateValue>
  dueCount?: number
  streak?: number
} = {}) {
  mockedUseCourseProgress.mockReturnValue({
    completedIds: new Set(),
    inProgressIds: new Set(),
    masteryByTag: mastery,
    mastery: [],
    loading: false,
    refresh: vi.fn(),
  })
  mockedUseDueReviews.mockReturnValue({
    due: [],
    dueCount,
    loading: false,
    refresh: vi.fn(),
  })
  mockedUseStreak.mockReturnValue({ streak, loading: false })

  render(
    <MemoryRouter>
      <LearningMetrics />
    </MemoryRouter>,
  )
}

describe('LearningMetrics', () => {
  beforeEach(() => {
    mockedUseCourseProgress.mockReset()
    mockedUseDueReviews.mockReset()
    mockedUseStreak.mockReset()
  })

  it('leads with the count of retained/fluent concepts', () => {
    setup({
      mastery: new Map<string, MasteryStateValue>([
        ['bounds', 'retained'],
        ['supremum', 'fluent'],
        ['infimum', 'practiced'],
        ['limits', 'seen'],
      ]),
    })

    const retained = screen.getByText('Concepts retained').closest('div')
    expect(retained).toHaveTextContent('2')
  })

  it('shows the due-for-review count and a review link when due', () => {
    setup({ dueCount: 3 })

    const due = screen.getByText('Due for review').closest('div')
    expect(due).toHaveTextContent('3')
    expect(screen.getByRole('link', { name: 'Review now' })).toBeInTheDocument()
  })

  it('hides the review link when nothing is due', () => {
    setup({ dueCount: 0 })

    expect(screen.queryByRole('link', { name: 'Review now' })).toBeNull()
  })

  it('renders the streak as a secondary stat', () => {
    setup({ streak: 5 })

    const streak = screen.getByText('Day streak').closest('div')
    expect(streak).toHaveTextContent('5')
    expect(streak).toHaveTextContent('days')
  })
})
