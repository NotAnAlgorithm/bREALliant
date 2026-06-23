import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { loadLesson } from '../../lib/content/schema-loader'
import { LessonRenderer } from './LessonRenderer'

describe('LessonRenderer', () => {
  it('navigates forward and back through steps', async () => {
    const user = userEvent.setup()
    const lesson = loadLesson('lesson-bounds-01')

    render(
      <MemoryRouter>
        <LessonRenderer lesson={lesson} />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Step 1 of 5/)).toBeInTheDocument()
    expect(
      screen.getByText(/Before we axiomatize the real numbers/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText(/Step 2 of 5/)).toBeInTheDocument()
    expect(screen.getByText(/Drag a point on the number line/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Number line from -0.5 to 2/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), '2')
    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toHaveValue('2')
  })
})
