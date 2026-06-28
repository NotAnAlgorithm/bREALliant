import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InitialEntry } from 'react-router-dom'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCourseProgress } from '../hooks/useCourseProgress'
import { Lesson } from './Lesson'

vi.mock('../hooks/useCourseProgress')
vi.mock('../hooks/useAuth', () => ({
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

const mockedUseCourseProgress = vi.mocked(useCourseProgress)

const LUB_MOTIVATION = /Now that we know what a supremum is/

function setProgress(completed: string[] = []) {
  mockedUseCourseProgress.mockReturnValue({
    completedIds: new Set(completed),
    inProgressIds: new Set(),
    masteryByTag: new Map(),
    mastery: [],
    loading: false,
    refresh: vi.fn(),
  })
}

function renderLesson(entry: InitialEntry) {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<div>Course path home</div>} />
        <Route path="/lesson/:lessonId" element={<Lesson />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Lesson prerequisite gate', () => {
  beforeEach(() => {
    mockedUseCourseProgress.mockReset()
  })

  it('gates a locked lesson reached by direct URL', () => {
    setProgress()
    renderLesson('/lesson/lesson-lub-01')

    expect(screen.getByText('Prerequisites not finished')).toBeInTheDocument()
    expect(screen.getByText('Bounds and Suprema')).toBeInTheDocument()
    expect(screen.queryByText(LUB_MOTIVATION)).toBeNull()
  })

  it('opens the lesson after the user continues anyway', async () => {
    const user = userEvent.setup()
    setProgress()
    renderLesson('/lesson/lesson-lub-01')

    await user.click(screen.getByRole('button', { name: 'Continue anyway' }))

    expect(await screen.findByText(LUB_MOTIVATION)).toBeInTheDocument()
    expect(screen.queryByText('Prerequisites not finished')).toBeNull()
  })

  it('skips the gate when navigation sets bypassPrereqGate', async () => {
    setProgress()
    renderLesson({
      pathname: '/lesson/lesson-lub-01',
      state: { bypassPrereqGate: true },
    })

    expect(await screen.findByText(LUB_MOTIVATION)).toBeInTheDocument()
    expect(screen.queryByText('Prerequisites not finished')).toBeNull()
  })

  it('does not gate an unlocked lesson', async () => {
    setProgress(['lesson-bounds-01'])
    renderLesson('/lesson/lesson-lub-01')

    expect(await screen.findByText(LUB_MOTIVATION)).toBeInTheDocument()
    expect(screen.queryByText('Prerequisites not finished')).toBeNull()
  })
})
