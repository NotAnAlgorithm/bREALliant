import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ThemeProvider } from '../../contexts/ThemeProvider'
import { ThemeToggle } from './ThemeToggle'

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('toggles the dark class on the document element and updates aria-label', async () => {
    const user = userEvent.setup()
    renderToggle()

    const button = screen.getByRole('button')
    const startsDark = document.documentElement.classList.contains('dark')

    await user.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(!startsDark)

    await user.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(startsDark)
  })

  it('switches to dark mode and reflects the action in the aria-label', async () => {
    const user = userEvent.setup()
    document.documentElement.classList.remove('dark')
    renderToggle()

    const button = screen.getByRole('button')

    if (!document.documentElement.classList.contains('dark')) {
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode')
      await user.click(button)
    }

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode')
  })
})
