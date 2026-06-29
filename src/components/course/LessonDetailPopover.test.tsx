import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  LessonDetailPopover,
  type LessonDetailPopoverProps,
} from './LessonDetailPopover'

function makeProps(
  overrides: Partial<LessonDetailPopoverProps> = {},
): LessonDetailPopoverProps {
  return {
    open: true,
    onClose: vi.fn(),
    title: 'Sequences and Convergence',
    status: 'unlocked',
    concepts: null,
    prerequisites: [],
    recommended: false,
    primaryLabel: 'Start',
    onPrimary: vi.fn(),
    ...overrides,
  }
}

describe('LessonDetailPopover', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <LessonDetailPopover {...makeProps({ open: false })} />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the title and primary button that calls onPrimary when unlocked', async () => {
    const user = userEvent.setup()
    const onPrimary = vi.fn()
    render(
      <LessonDetailPopover
        {...makeProps({ status: 'unlocked', primaryLabel: 'Start', onPrimary })}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Sequences and Convergence' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(onPrimary).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the Close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<LessonDetailPopover {...makeProps({ onClose })} />)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<LessonDetailPopover {...makeProps({ onClose })} />)

    await user.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows Continue anyway and unsatisfied prerequisites when locked', async () => {
    const user = userEvent.setup()
    const onContinueAnyway = vi.fn()
    const onPrimary = vi.fn()
    render(
      <LessonDetailPopover
        {...makeProps({
          status: 'locked',
          primaryLabel: 'Review',
          onPrimary,
          onContinueAnyway,
          prerequisites: [
            { lessonId: 'l1', title: 'Open Sets', satisfied: true },
            { lessonId: 'l2', title: 'Limit Points', satisfied: false },
          ],
        })}
      />,
    )

    expect(screen.getByText('Limit Points')).toBeInTheDocument()
    expect(screen.getByText('Open Sets')).toBeInTheDocument()

    expect(
      screen.queryByRole('button', { name: 'Review' }),
    ).not.toBeInTheDocument()

    const continueButton = screen.getByRole('button', {
      name: 'Continue anyway',
    })
    await user.click(continueButton)
    expect(onContinueAnyway).toHaveBeenCalledTimes(1)
    expect(onPrimary).not.toHaveBeenCalled()
  })

  it('shows mastery text when concepts are provided', () => {
    render(
      <LessonDetailPopover
        {...makeProps({ concepts: { retained: 2, total: 3 } })}
      />,
    )

    expect(screen.getByText('2/3')).toBeInTheDocument()
    expect(screen.getByText(/concepts mastered/i)).toBeInTheDocument()
  })

  it('hides mastery text when total is 0', () => {
    render(
      <LessonDetailPopover
        {...makeProps({ concepts: { retained: 0, total: 0 } })}
      />,
    )

    expect(screen.queryByText(/concepts mastered/i)).not.toBeInTheDocument()
  })

  it('shows the recommended badge when recommended', () => {
    render(<LessonDetailPopover {...makeProps({ recommended: true })} />)

    expect(screen.getByText('Recommended next')).toBeInTheDocument()
  })

  it('closes on Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<LessonDetailPopover {...makeProps({ onClose })} />)

    // Focus a control inside the dialog so the keydown bubbles to the handler.
    screen.getByRole('button', { name: 'Start' }).focus()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
