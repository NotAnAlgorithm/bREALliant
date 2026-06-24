import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DragOrderWidget } from './DragOrderWidget'

const widget = {
  kind: 'drag_order' as const,
  props: {
    items: [
      { id: '1', label: 'Alpha' },
      { id: '2', label: 'Beta' },
      { id: '3', label: 'Gamma' },
    ],
  },
}

describe('DragOrderWidget', () => {
  it('renders items in the current order', () => {
    render(
      <DragOrderWidget
        widget={widget}
        state={{ order: ['1', '2', '3'] }}
        onStateChange={vi.fn()}
      />,
    )

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Alpha')
    expect(rows[1]).toHaveTextContent('Beta')
    expect(rows[2]).toHaveTextContent('Gamma')
  })

  it('moves an item down and reports the new order', async () => {
    const user = userEvent.setup()
    const onStateChange = vi.fn()

    render(
      <DragOrderWidget
        widget={widget}
        state={{ order: ['1', '2', '3'] }}
        onStateChange={onStateChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Move "Alpha" down' }))

    expect(onStateChange).toHaveBeenCalledWith({ order: ['2', '1', '3'] })
  })

  it('moves an item up and reports the new order', async () => {
    const user = userEvent.setup()
    const onStateChange = vi.fn()

    render(
      <DragOrderWidget
        widget={widget}
        state={{ order: ['1', '2', '3'] }}
        onStateChange={onStateChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Move "Gamma" up' }))

    expect(onStateChange).toHaveBeenCalledWith({ order: ['1', '3', '2'] })
  })

  it('disables up on the first row and down on the last row', () => {
    render(
      <DragOrderWidget
        widget={widget}
        state={{ order: ['1', '2', '3'] }}
        onStateChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Move "Alpha" up' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Move "Gamma" down' }),
    ).toBeDisabled()
  })
})
