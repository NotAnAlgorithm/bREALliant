import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { NumberLineWidget } from './NumberLineWidget'

describe('NumberLineWidget', () => {
  it('renders and reports marker position changes', async () => {
    const user = userEvent.setup()
    const onStateChange = vi.fn()

    render(
      <NumberLineWidget
        widget={{
          kind: 'number_line',
          props: { min: 0, max: 2, initialMarker: 1 },
        }}
        state={{ markerPosition: 1 }}
        onStateChange={onStateChange}
      />,
    )

    expect(screen.getByRole('img', { name: /Number line from 0 to 2/ })).toBeInTheDocument()
    expect(screen.getByText(/Current value:/)).toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '1')

    const slider = screen.getByRole('slider')
    await user.pointer({ keys: '[MouseLeft>]', target: slider })
    await user.pointer({ coords: { clientX: 200, clientY: 50 } })
    await user.pointer({ keys: '[/MouseLeft]' })

    expect(onStateChange).toHaveBeenCalled()
  })

  it('shows a fraction readout and normalizes on mount when snapping', () => {
    const onStateChange = vi.fn()

    render(
      <NumberLineWidget
        widget={{
          kind: 'number_line',
          props: { min: 0, max: 2, initialMarker: 0.5, snapDenominator: 2 },
        }}
        state={{ markerPosition: 0.5 }}
        onStateChange={onStateChange}
      />,
    )

    expect(screen.getByText(/1\/2/)).toBeInTheDocument()
    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ markerFraction: '1/2' }),
    )
  })

  it('reports a fraction label after interaction when snapping', async () => {
    const user = userEvent.setup()
    const onStateChange = vi.fn()

    render(
      <NumberLineWidget
        widget={{
          kind: 'number_line',
          props: { min: 0, max: 2, initialMarker: 1, snapDenominator: 2 },
        }}
        state={{ markerPosition: 1, markerFraction: '1' }}
        onStateChange={onStateChange}
      />,
    )

    const slider = screen.getByRole('slider')
    await user.pointer({ keys: '[MouseLeft>]', target: slider })
    await user.pointer({ coords: { clientX: 200, clientY: 50 } })
    await user.pointer({ keys: '[/MouseLeft]' })

    expect(onStateChange).toHaveBeenCalled()
    const lastCall = onStateChange.mock.calls.at(-1)?.[0]
    expect(typeof lastCall.markerFraction).toBe('string')
  })
})
