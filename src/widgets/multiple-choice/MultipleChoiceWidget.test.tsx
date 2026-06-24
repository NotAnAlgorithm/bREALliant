import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MultipleChoiceWidget } from './MultipleChoiceWidget'

const widget = {
  kind: 'multiple_choice' as const,
  props: {
    choices: [
      { id: 'a', label: 'First choice' },
      { id: 'b', label: 'Second choice' },
      { id: 'c', label: 'Third choice' },
    ],
  },
}

describe('MultipleChoiceWidget', () => {
  it('renders all choices', () => {
    render(
      <MultipleChoiceWidget
        widget={widget}
        state={{ selectedId: '' }}
        onStateChange={vi.fn()}
      />,
    )

    expect(screen.getByText('First choice')).toBeInTheDocument()
    expect(screen.getByText('Second choice')).toBeInTheDocument()
    expect(screen.getByText('Third choice')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('reports the selected choice id when clicked', async () => {
    const user = userEvent.setup()
    const onStateChange = vi.fn()

    render(
      <MultipleChoiceWidget
        widget={widget}
        state={{ selectedId: '' }}
        onStateChange={onStateChange}
      />,
    )

    await user.click(screen.getByText('Second choice'))

    expect(onStateChange).toHaveBeenCalledWith({ selectedId: 'b' })
  })

  it('marks the selected choice as checked', () => {
    render(
      <MultipleChoiceWidget
        widget={widget}
        state={{ selectedId: 'c' }}
        onStateChange={vi.fn()}
      />,
    )

    const selected = screen.getByRole('radio', { checked: true })
    expect(selected).toHaveTextContent('Third choice')
  })
})
