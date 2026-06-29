import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CourseViewProvider } from '../../contexts/CourseViewProvider'
import { CourseViewToggle } from './CourseViewToggle'

function renderToggle() {
  return render(
    <CourseViewProvider>
      <CourseViewToggle />
    </CourseViewProvider>,
  )
}

describe('CourseViewToggle', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('defaults to the map view', () => {
    renderToggle()

    expect(screen.getByRole('button', { name: 'Map view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(window.localStorage.getItem('course-view')).toBe('map')
  })

  it('updates pressed state and persists when switching views', async () => {
    const user = userEvent.setup()
    renderToggle()

    const mapButton = screen.getByRole('button', { name: 'Map view' })
    const listButton = screen.getByRole('button', { name: 'List view' })

    await user.click(listButton)
    expect(listButton).toHaveAttribute('aria-pressed', 'true')
    expect(mapButton).toHaveAttribute('aria-pressed', 'false')
    expect(window.localStorage.getItem('course-view')).toBe('list')

    await user.click(mapButton)
    expect(mapButton).toHaveAttribute('aria-pressed', 'true')
    expect(listButton).toHaveAttribute('aria-pressed', 'false')
    expect(window.localStorage.getItem('course-view')).toBe('map')
  })
})
