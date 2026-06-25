import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { loadLesson } from '../../lib/content/schema-loader'
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

describe('LessonRenderer', () => {
  it('navigates forward and back through steps', async () => {
    const user = userEvent.setup()
    const lesson = loadLesson('lesson-bounds-01')

    render(
      <MemoryRouter>
        <LessonRenderer lesson={lesson} />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Step 1 of 9/)).toBeInTheDocument()
    expect(
      screen.getByText(/Last lesson left a set climbing toward a boundary/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText(/Step 2 of 9/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText(/Step 3 of 9/)).toBeInTheDocument()
    expect(screen.getByText(/Explore/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Number line from -0.5 to 2/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText(/Step 2 of 9/)).toBeInTheDocument()
  })
})
