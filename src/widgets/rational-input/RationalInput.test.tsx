import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RationalInput } from './RationalInput'

describe('RationalInput', () => {
  it('renders numerator and denominator inputs', () => {
    render(
      <RationalInput
        widget={{ kind: 'rational_input', props: {} }}
        state={{ num: '', den: '' }}
        onStateChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('textbox', { name: 'numerator' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'denominator' })).toBeTruthy()
  })

  it('updates the numerator', async () => {
    const user = userEvent.setup()
    const onStateChange = vi.fn()

    render(
      <RationalInput
        widget={{ kind: 'rational_input', props: {} }}
        state={{ num: '', den: '' }}
        onStateChange={onStateChange}
      />,
    )

    await user.type(screen.getByRole('textbox', { name: 'numerator' }), '5')
    expect(onStateChange).toHaveBeenLastCalledWith({ num: '5', den: '' })
  })

  it('updates the denominator while preserving the numerator', async () => {
    const user = userEvent.setup()
    const onStateChange = vi.fn()

    render(
      <RationalInput
        widget={{ kind: 'rational_input', props: {} }}
        state={{ num: '2', den: '' }}
        onStateChange={onStateChange}
      />,
    )

    await user.type(screen.getByRole('textbox', { name: 'denominator' }), '7')
    expect(onStateChange).toHaveBeenLastCalledWith({ num: '2', den: '7' })
  })

  it('disables both inputs when disabled', () => {
    render(
      <RationalInput
        widget={{ kind: 'rational_input', props: {} }}
        state={{ num: '1', den: '2' }}
        onStateChange={vi.fn()}
        disabled
      />,
    )

    expect(screen.getByRole('textbox', { name: 'numerator' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'denominator' })).toBeDisabled()
  })
})
