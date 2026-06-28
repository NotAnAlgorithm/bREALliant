import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '../hooks/useAuth'
import { useCourseProgress } from '../hooks/useCourseProgress'
import { recordReview } from '../services/review'
import { Practice } from './Practice'

vi.mock('../hooks/useAuth')
vi.mock('../hooks/useCourseProgress')
vi.mock('../lib/supabase', () => ({ supabase: {} }))
vi.mock('../services/review', () => ({
  recordReview: vi.fn().mockResolvedValue({}),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseCourseProgress = vi.mocked(useCourseProgress)
const mockedRecordReview = vi.mocked(recordReview)

function signedIn() {
  mockedUseAuth.mockReturnValue({
    user: { id: 'user-1' },
  } as unknown as ReturnType<typeof useAuth>)
}

function setMastery(entries: [string, string][]) {
  mockedUseCourseProgress.mockReturnValue({
    completedIds: new Set(),
    inProgressIds: new Set(),
    masteryByTag: new Map(entries) as Map<
      string,
      'seen' | 'practiced' | 'retained' | 'fluent'
    >,
    mastery: [],
    loading: false,
    refresh: vi.fn(),
  })
}

function renderPractice() {
  render(
    <MemoryRouter>
      <Practice />
    </MemoryRouter>,
  )
}

describe('Practice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state when no concept is practiced yet', () => {
    signedIn()
    setMastery([])
    renderPractice()

    expect(screen.getByText(/No mixed practice yet/i)).toBeInTheDocument()
  })

  it('builds a session from practiced concepts and records attempts', async () => {
    const user = userEvent.setup()
    signedIn()
    setMastery([['lub', 'retained']])
    renderPractice()

    expect(screen.getByText(/Problem 1 of/)).toBeInTheDocument()
    expect(screen.getAllByText('lub').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Check' }))

    expect(mockedRecordReview).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'lub',
      expect.any(Boolean),
    )
  })
})
