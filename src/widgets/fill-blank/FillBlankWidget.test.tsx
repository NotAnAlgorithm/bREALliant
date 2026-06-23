import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FillBlankWidget } from './FillBlankWidget'

describe('FillBlankWidget', () => {
  it('renders template with input and updates state', async () => {
    const user = userEvent.setup()
    const onStateChange = vi.fn()

    render(
      <FillBlankWidget
        widget={{
          kind: 'fill_blank',
          props: { template: 'M \\ge {{answer}}', placeholder: '?' },
        }}
        state={{ answer: '' }}
        onStateChange={onStateChange}
      />,
    )

    expect(document.querySelector('.katex')).toBeTruthy()

    const input = screen.getByRole('textbox', { name: 'Your answer' })
    await user.type(input, '1')

    expect(onStateChange).toHaveBeenLastCalledWith({ answer: '1' })
  })
})
