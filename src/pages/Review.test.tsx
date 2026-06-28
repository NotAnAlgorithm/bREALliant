import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '../hooks/useAuth'
import { useDueReviews } from '../hooks/useDueReviews'
import { recordReview } from '../services/review'
import { Review } from './Review'

vi.mock('../hooks/useAuth')
vi.mock('../hooks/useDueReviews')
vi.mock('../lib/supabase', () => ({ supabase: {} }))
vi.mock('../services/review', () => ({
  recordReview: vi.fn().mockResolvedValue({}),
  loadDueConcepts: vi.fn().mockResolvedValue([]),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseDueReviews = vi.mocked(useDueReviews)
const mockedRecordReview = vi.mocked(recordReview)

function signedIn() {
  mockedUseAuth.mockReturnValue({
    user: { id: 'user-1' },
  } as unknown as ReturnType<typeof useAuth>)
}

function renderReview() {
  render(
    <MemoryRouter>
      <Review />
    </MemoryRouter>,
  )
}

describe('Review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the caught-up state when nothing is due', () => {
    signedIn()
    mockedUseDueReviews.mockReturnValue({
      due: [],
      dueCount: 0,
      loading: false,
      refresh: vi.fn(),
    })

    renderReview()

    expect(screen.getByText(/All caught up/i)).toBeInTheDocument()
  })

  it('presents a due concept and records the attempt on check', async () => {
    const user = userEvent.setup()
    signedIn()
    mockedUseDueReviews.mockReturnValue({
      due: [
        {
          tag: 'lub',
          state: 'retained',
          strength: 0.8,
          reviewLevel: 0,
          dueAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      dueCount: 1,
      loading: false,
      refresh: vi.fn(),
    })

    renderReview()

    expect(screen.getByText(/Concept 1 of 1/)).toBeInTheDocument()
    expect(screen.getByText('lub')).toBeInTheDocument()
    expect(
      screen.getByText(/least upper bound property says/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Check' }))

    expect(mockedRecordReview).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'lub',
      expect.any(Boolean),
    )
    expect(
      screen.getByRole('button', { name: 'Finish review' }),
    ).toBeInTheDocument()
  })
})
