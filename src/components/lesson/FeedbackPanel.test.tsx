import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FeedbackPanel } from './FeedbackPanel'

describe('FeedbackPanel', () => {
  it('renders a plain message', () => {
    render(<FeedbackPanel correct message="Correct — 1 is the supremum." />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Correct — 1 is the supremum.',
    )
  })

  it('renders inline LaTeX in the message', () => {
    const { container } = render(
      <FeedbackPanel correct={false} message="Recall that $x^2 = 2$ here." />,
    )
    // KaTeX produces a .katex node when the math is actually rendered.
    expect(container.querySelector('.katex')).not.toBeNull()
    // Surrounding prose is still present.
    expect(screen.getByRole('status')).toHaveTextContent(/Recall that/)
    expect(screen.getByRole('status')).toHaveTextContent(/here\./)
  })
})
