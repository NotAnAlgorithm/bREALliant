import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MasteryStateValue } from '../../lib/database.types'
import { useCourseProgress } from '../../hooks/useCourseProgress'
import { PracticeMore } from './PracticeMore'

vi.mock('../../hooks/useCourseProgress')

const mockedUseCourseProgress = vi.mocked(useCourseProgress)

function setMastery(
  masteryByTag: Map<string, MasteryStateValue> = new Map(),
  loading = false,
) {
  mockedUseCourseProgress.mockReturnValue({
    completedIds: new Set(),
    inProgressIds: new Set(),
    masteryByTag,
    mastery: [],
    loading,
    refresh: vi.fn(),
  })
}

describe('PracticeMore', () => {
  beforeEach(() => {
    mockedUseCourseProgress.mockReset()
    setMastery()
  })

  it('renders nothing when the lesson has no tags', () => {
    const { container } = render(<PracticeMore tags={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('reveals an interleaved session for a practiced concept with items', async () => {
    const user = userEvent.setup()
    setMastery(new Map<string, MasteryStateValue>([['supremum', 'retained']]))

    render(<PracticeMore tags={['supremum']} />)

    await user.click(
      screen.getByRole('button', { name: /practice more problems/i }),
    )

    expect(screen.getByText(/Practice 1 of/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument()
  })

  it('checks an answer and renders feedback inside the runner', async () => {
    const user = userEvent.setup()
    setMastery(new Map<string, MasteryStateValue>([['supremum', 'retained']]))

    render(<PracticeMore tags={['supremum']} />)

    await user.click(
      screen.getByRole('button', { name: /practice more problems/i }),
    )
    await user.click(screen.getByRole('button', { name: 'Check' }))

    // The runner advances its state: a feedback status is surfaced.
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows the empty state for a concept that is only seen', () => {
    // Default mastery ('seen') is not eligible for interleaved practice.
    setMastery(new Map<string, MasteryStateValue>([['supremum', 'seen']]))

    render(<PracticeMore tags={['supremum']} />)

    expect(
      screen.getByText(/No extra practice available/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /practice more problems/i }),
    ).toBeNull()
  })

  it('shows the empty state for an unknown tag', () => {
    setMastery(
      new Map<string, MasteryStateValue>([['no-such-concept', 'retained']]),
    )

    render(<PracticeMore tags={['no-such-concept']} />)

    expect(
      screen.getByText(/No extra practice available/i),
    ).toBeInTheDocument()
  })
})
