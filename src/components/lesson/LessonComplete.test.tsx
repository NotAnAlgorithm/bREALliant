import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { LessonComplete, type LessonCompleteData } from './LessonComplete'

function renderComplete(overrides: Partial<LessonCompleteData> = {}) {
  const data: LessonCompleteData = {
    lessonTitle: 'Bounds and Suprema',
    streak: 3,
    unlockedTitles: ['The Least Upper Bound Property'],
    nextLessonId: 'lesson-lub-01',
    nextLessonTitle: 'The Least Upper Bound Property',
    unitComplete: false,
    courseComplete: false,
    ...overrides,
  }
  render(
    <MemoryRouter>
      <LessonComplete {...data} />
    </MemoryRouter>,
  )
}

describe('LessonComplete', () => {
  it('shows the lesson title, streak and unlocked lessons', () => {
    renderComplete()
    expect(screen.getByText('Lesson complete!')).toBeInTheDocument()
    expect(screen.getByText('Bounds and Suprema')).toBeInTheDocument()
    expect(screen.getByText('3 day streak')).toBeInTheDocument()
    expect(screen.getByText('You unlocked')).toBeInTheDocument()
    expect(
      screen.getByText('The Least Upper Bound Property'),
    ).toBeInTheDocument()
  })

  it('links to the next lesson when provided', () => {
    renderComplete()
    const next = screen.getByRole('link', {
      name: /Next: The Least Upper Bound Property/,
    })
    expect(next).toHaveAttribute('href', '/lesson/lesson-lub-01')
  })

  it('escalates the heading at unit and course milestones', () => {
    renderComplete({ unitComplete: true })
    expect(screen.getByText('Unit complete!')).toBeInTheDocument()
  })

  it('shows course completion and omits the next link when finished', () => {
    renderComplete({
      courseComplete: true,
      unitComplete: true,
      nextLessonId: null,
      nextLessonTitle: null,
      unlockedTitles: [],
    })
    expect(screen.getByText('Course complete!')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Next:/ })).toBeNull()
  })

  it('hides the streak badge when there is no streak', () => {
    renderComplete({ streak: 0 })
    expect(screen.queryByText(/day streak/)).toBeNull()
  })
})
