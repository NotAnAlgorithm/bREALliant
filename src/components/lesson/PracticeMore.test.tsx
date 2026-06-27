import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { PracticeMore } from './PracticeMore'

describe('PracticeMore', () => {
  it('renders nothing when the lesson has no tags', () => {
    const { container } = render(<PracticeMore tags={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('loads verified local practice for a known concept (AI off)', async () => {
    const user = userEvent.setup()
    render(<PracticeMore tags={['supremum']} />)

    await user.click(
      screen.getByRole('button', { name: /practice more problems/i }),
    )

    expect(await screen.findByText(/Practice 1 of/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument()
  })

  it('shows an empty state for a concept with no template (AI off)', async () => {
    const user = userEvent.setup()
    render(<PracticeMore tags={['no-such-concept']} />)

    await user.click(
      screen.getByRole('button', { name: /practice more problems/i }),
    )

    expect(
      await screen.findByText(/No extra practice available/i),
    ).toBeInTheDocument()
  })
})
