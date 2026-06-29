import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RichText } from './RichText'

describe('RichText', () => {
  it('renders inline math in prompts', () => {
    render(<RichText content="For $E = (0,1)$ find $\\sup E$." />)
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

  it('lets strong span across inline math', () => {
    const { container } = render(
      <RichText content="So it **converges to $S$** precisely." />,
    )
    const strong = container.querySelector('strong')
    expect(strong).not.toBeNull()
    expect(strong).toHaveTextContent('converges to')
    expect(strong?.querySelector('.katex')).not.toBeNull()
    // The asterisks must not leak into the output.
    expect(container).not.toHaveTextContent('**')
  })

  it('lets em span across inline math', () => {
    const { container } = render(<RichText content="*near $x$ here*" />)
    const em = container.querySelector('em')
    expect(em).not.toBeNull()
    expect(em).toHaveTextContent('near')
    expect(em).toHaveTextContent('here')
    expect(em?.querySelector('.katex')).not.toBeNull()
  })

  it('renders math, strong, math in sequence', () => {
    const { container } = render(<RichText content="$a$ **bold** $b$" />)
    expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(2)
    const strong = container.querySelector('strong')
    expect(strong).toHaveTextContent('bold')
  })

  it('lets strong span two math spans', () => {
    const { container } = render(
      <RichText content="**bold $x$ and $y$ done**" />,
    )
    const strong = container.querySelector('strong')
    expect(strong).not.toBeNull()
    expect(strong?.querySelectorAll('.katex').length).toBe(2)
    expect(strong).toHaveTextContent('done')
  })

  it('treats inline code as opaque (no katex, literal $)', () => {
    const { container } = render(
      <RichText content="a `code with $x$ inside` b" />,
    )
    const code = container.querySelector('code')
    expect(code).not.toBeNull()
    expect(code).toHaveTextContent('code with $x$ inside')
    expect(container.querySelector('.katex')).toBeNull()
  })

  it('passes math internals through untouched', () => {
    const { container } = render(<RichText content="$a*b*c$ and $a_b$" />)
    expect(container.querySelector('em')).toBeNull()
    expect(container.querySelector('strong')).toBeNull()
    expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(2)
  })

  it('renders block math as a block element', () => {
    const { container } = render(<RichText content="$$x^2$$" />)
    const block = container.querySelector('.math-block')
    expect(block).not.toBeNull()
    expect(block?.querySelector('.katex')).not.toBeNull()
  })

  it('renders unmatched delimiters literally without throwing', () => {
    const { container } = render(
      <RichText content="a lone * and a lone ` and a lone $ end" />,
    )
    expect(container.querySelector('em')).toBeNull()
    expect(container.querySelector('strong')).toBeNull()
    expect(container.querySelector('code')).toBeNull()
    expect(container.querySelector('.katex')).toBeNull()
    expect(screen.getByText(/a lone \* and a lone ` and a lone \$ end/)).toBeInTheDocument()
  })
})
