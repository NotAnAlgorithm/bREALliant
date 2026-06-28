import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConceptMasterySummary } from '../../services/progress'
import { useCourseProgress } from '../../hooks/useCourseProgress'
import { useDueReviews } from '../../hooks/useDueReviews'
import { NextUp } from './NextUp'

vi.mock('../../hooks/useCourseProgress')
vi.mock('../../hooks/useDueReviews')

const mockedProgress = vi.mocked(useCourseProgress)
const mockedDue = vi.mocked(useDueReviews)

function setProgress({
  completed = [] as string[],
  mastery = [] as ConceptMasterySummary[],
  loading = false,
}: {
  completed?: string[]
  mastery?: ConceptMasterySummary[]
  loading?: boolean
} = {}) {
  mockedProgress.mockReturnValue({
    completedIds: new Set(completed),
    inProgressIds: new Set(),
    masteryByTag: new Map(mastery.map((m) => [m.tag, m.state])),
    mastery,
    loading,
    refresh: vi.fn(),
  })
}

function setDue(dueCount: number, loading = false) {
  mockedDue.mockReturnValue({
    due: [],
    dueCount,
    loading,
    refresh: vi.fn(),
  })
}

function renderNextUp() {
  render(
    <MemoryRouter>
      <NextUp />
    </MemoryRouter>,
  )
}

describe('NextUp', () => {
  beforeEach(() => {
    mockedProgress.mockReset()
    mockedDue.mockReset()
  })

  it('renders nothing while progress or reviews are loading', () => {
    setProgress({ loading: true })
    setDue(0)
    const { container } = render(
      <MemoryRouter>
        <NextUp />
      </MemoryRouter>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('points a brand-new learner at the first lesson', () => {
    setProgress()
    setDue(0)
    renderNextUp()

    expect(screen.getByText('Up next')).toBeInTheDocument()
    const cta = screen.getByRole('link', { name: 'Start lesson' })
    expect(cta).toHaveAttribute('href', '/lesson/lesson-rationals-01')
  })

  it('prioritizes due reviews over new material', () => {
    setProgress({ completed: ['lesson-rationals-01'] })
    setDue(4)
    renderNextUp()

    expect(screen.getByText('Review')).toBeInTheDocument()
    expect(screen.getByText('4 concepts are due for review')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review now' })).toHaveAttribute(
      'href',
      '/review',
    )
  })

  it('recommends shoring up a decayed concept', () => {
    setProgress({
      completed: ['lesson-rationals-01'],
      mastery: [{ tag: 'rationals', state: 'seen', strength: 0.4 }],
    })
    setDue(0)
    renderNextUp()

    expect(screen.getByText('Shore up')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revisit' })).toHaveAttribute(
      'href',
      '/lesson/lesson-rationals-01',
    )
  })
})
