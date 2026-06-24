import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FractionLineWidget } from './FractionLineWidget'

describe('FractionLineWidget', () => {
  it('shows the midpoint of two fractions in two-input mode', () => {
    render(
      <FractionLineWidget
        widget={{
          kind: 'fraction_line',
          props: { min: 0, max: 1, inputs: 2, showMidpoint: true },
        }}
        state={{ aNum: 1, aDen: 3, bNum: 1, bDen: 2 }}
        onStateChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('img', { name: /Number line from 0 to 1/ }))
      .toBeInTheDocument()
    // midpoint of 1/3 and 1/2 is 5/12 ≈ 0.4167
    expect(screen.getByText(/0\.4167/)).toBeInTheDocument()
  })

  it('reports fraction changes through onStateChange', async () => {
    const user = userEvent.setup()
    const onStateChange = vi.fn()

    render(
      <FractionLineWidget
        widget={{ kind: 'fraction_line', props: { inputs: 1 } }}
        state={{ aNum: 1, aDen: 2 }}
        onStateChange={onStateChange}
      />,
    )

    const numerator = screen.getByLabelText('p numerator')
    await user.clear(numerator)
    await user.type(numerator, '3')

    expect(onStateChange).toHaveBeenCalled()
  })

  it('reports a square-vs-target comparison when transform is set', () => {
    render(
      <FractionLineWidget
        widget={{
          kind: 'fraction_line',
          props: { min: 1, max: 2, inputs: 1, transform: 'square', target: 2 },
        }}
        state={{ aNum: 7, aDen: 5 }}
        onStateChange={vi.fn()}
      />,
    )

    // (7/5)^2 = 1.96 < 2
    expect(screen.getByText(/1\.9600/)).toBeInTheDocument()
    expect(screen.getByText(/< 2/)).toBeInTheDocument()
  })

  it('renders band labels above the axis', () => {
    render(
      <FractionLineWidget
        widget={{
          kind: 'fraction_line',
          props: {
            min: 1,
            max: 2,
            inputs: 1,
            transform: 'square',
            target: 2,
            bands: [
              { label: 'x² < 2', side: 'below' },
              { label: 'x² > 2', side: 'above' },
            ],
          },
        }}
        state={{ aNum: 3, aDen: 2 }}
        onStateChange={vi.fn()}
      />,
    )

    expect(screen.getByText('x² < 2')).toBeInTheDocument()
    expect(screen.getByText('x² > 2')).toBeInTheDocument()
  })
})
