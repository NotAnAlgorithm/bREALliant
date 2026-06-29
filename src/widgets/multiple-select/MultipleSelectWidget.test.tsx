import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MultipleSelectWidget } from './MultipleSelectWidget'

const widget = {
  kind: 'multiple_select' as const,
  props: {
    choices: [
      { id: 'a', label: 'First choice' },
      { id: 'b', label: 'Second choice' },
      { id: 'c', label: 'Third choice' },
      { id: 'd', label: 'Fourth choice' },
    ],
  },
}

describe('MultipleSelectWidget', () => {
  it('renders all choices as checkboxes with a helper line', () => {
    render(
      <MultipleSelectWidget
        widget={widget}
        state={{ selectedIds: [] }}
        onStateChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Select all that apply.')).toBeInTheDocument()
    expect(screen.getByText('First choice')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
  })

  it('adds a choice (sorted) when an unselected option is clicked', async () => {
    const user = userEvent.setup()
    const onStateChange = vi.fn()

    render(
      <MultipleSelectWidget
        widget={widget}
        state={{ selectedIds: ['c'] }}
        onStateChange={onStateChange}
      />,
    )

    await user.click(screen.getByText('First choice'))

    expect(onStateChange).toHaveBeenCalledWith({ selectedIds: ['a', 'c'] })
  })

  it('removes a choice when an already-selected option is clicked', async () => {
    const user = userEvent.setup()
    const onStateChange = vi.fn()

    render(
      <MultipleSelectWidget
        widget={widget}
        state={{ selectedIds: ['a', 'c'] }}
        onStateChange={onStateChange}
      />,
    )

    await user.click(screen.getByText('First choice'))

    expect(onStateChange).toHaveBeenCalledWith({ selectedIds: ['c'] })
  })

  it('marks the selected choices as checked', () => {
    render(
      <MultipleSelectWidget
        widget={widget}
        state={{ selectedIds: ['b', 'd'] }}
        onStateChange={vi.fn()}
      />,
    )

    const checked = screen.getAllByRole('checkbox', { checked: true })
    expect(checked).toHaveLength(2)
    // Display order is scrambled, so assert membership rather than position.
    const labels = checked.map((el) => el.textContent)
    expect(labels).toEqual(
      expect.arrayContaining(['Second choice', 'Fourth choice']),
    )
  })

  it('does not call onStateChange when disabled', async () => {
    const user = userEvent.setup()
    const onStateChange = vi.fn()

    render(
      <MultipleSelectWidget
        widget={widget}
        state={{ selectedIds: [] }}
        onStateChange={onStateChange}
        disabled
      />,
    )

    await user.click(screen.getByText('First choice'))

    expect(onStateChange).not.toHaveBeenCalled()
  })

  it('honors a custom selectAllHint', () => {
    render(
      <MultipleSelectWidget
        widget={{ ...widget, props: { ...widget.props, selectAllHint: 'Pick two.' } }}
        state={{ selectedIds: [] }}
        onStateChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Pick two.')).toBeInTheDocument()
  })
})
