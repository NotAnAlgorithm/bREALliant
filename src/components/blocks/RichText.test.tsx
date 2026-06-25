import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RichText } from './RichText'

describe('RichText', () => {
  it('renders inline math in prompts', () => {
    render(
      <RichText content="For $E = (0,1)$ find $\\sup E$." />,
    )
    expect(document.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/For/)).toBeInTheDocument()
  })

  it('renders inline markdown in plain prompts', () => {
    const { container } = render(
      <RichText content="plain *italic* and **bold** words" />,
    )
    const em = container.querySelector('em')
    const strong = container.querySelector('strong')
    expect(em).toHaveTextContent('italic')
    expect(strong).toHaveTextContent('bold')
  })

  it('does not apply markdown inside math segments', () => {
    const { container } = render(<RichText content="value $a * b$ end" />)
    expect(container.querySelector('.katex')).not.toBeNull()
    expect(container.querySelector('em')).toBeNull()
  })
})
