import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GlossaryProvider } from '../../contexts/GlossaryProvider'
import { renderInlineMarkdown } from './inline-markdown'

describe('renderInlineMarkdown', () => {
  it('renders *italic* as <em>', () => {
    const { container } = render(<>{renderInlineMarkdown('*text*')}</>)
    const em = container.querySelector('em')
    expect(em).not.toBeNull()
    expect(em).toHaveTextContent('text')
  })

  it('renders **bold** as <strong>', () => {
    const { container } = render(<>{renderInlineMarkdown('**text**')}</>)
    const strong = container.querySelector('strong')
    expect(strong).not.toBeNull()
    expect(strong).toHaveTextContent('text')
    expect(container.querySelector('em')).toBeNull()
  })

  it('renders `code` as <code>', () => {
    const { container } = render(<>{renderInlineMarkdown('`x`')}</>)
    const code = container.querySelector('code')
    expect(code).not.toBeNull()
    expect(code).toHaveTextContent('x')
  })

  it('italicizes the middle word and keeps surrounding text', () => {
    const { container } = render(
      <>{renderInlineMarkdown('text *text* text')}</>,
    )
    const em = container.querySelector('em')
    expect(em).toHaveTextContent('text')
    expect(container).toHaveTextContent('text text text')
  })

  it('renders an unmatched * literally', () => {
    const { container } = render(
      <>{renderInlineMarkdown('a * b with no close')}</>,
    )
    expect(container.querySelector('em')).toBeNull()
    expect(container.querySelector('strong')).toBeNull()
    expect(screen.getByText(/a \* b with no close/)).toBeInTheDocument()
  })

  it('returns an empty array for an empty string', () => {
    expect(renderInlineMarkdown('')).toEqual([])
  })

  it('supports multiple emphasis spans in one string', () => {
    const { container } = render(
      <>{renderInlineMarkdown('*a* and *b* and **c**')}</>,
    )
    expect(container.querySelectorAll('em')).toHaveLength(2)
    expect(container.querySelectorAll('strong')).toHaveLength(1)
  })

  it('renders [[term]] as a clickable definition term', () => {
    const glossary = { field: { definition: 'A nice algebraic structure.' } }
    render(
      <GlossaryProvider glossary={glossary}>
        {renderInlineMarkdown('a [[field]] has nice properties')}
      </GlossaryProvider>,
    )
    expect(screen.getByRole('button', { name: 'field' })).toBeInTheDocument()
    expect(screen.getByText(/has nice properties/)).toBeInTheDocument()
  })

  it('renders [[display|key]] using the display label', () => {
    const glossary = { field: { definition: 'A nice algebraic structure.' } }
    render(
      <GlossaryProvider glossary={glossary}>
        {renderInlineMarkdown('two [[fields|field]] here')}
      </GlossaryProvider>,
    )
    expect(screen.getByRole('button', { name: 'fields' })).toBeInTheDocument()
  })

  it('renders an unmatched [[ literally', () => {
    const { container } = render(<>{renderInlineMarkdown('a [[ b with no close')}</>)
    expect(container.querySelector('button')).toBeNull()
    expect(screen.getByText(/a \[\[ b with no close/)).toBeInTheDocument()
  })

  it('renders inline math as katex', () => {
    const { container } = render(<>{renderInlineMarkdown('value $x+1$ here')}</>)
    expect(container.querySelector('.katex')).not.toBeNull()
  })

  it('wraps math inside a strong span', () => {
    const { container } = render(
      <>{renderInlineMarkdown('**converges to $S$**')}</>,
    )
    const strong = container.querySelector('strong')
    expect(strong).not.toBeNull()
    expect(strong).toHaveTextContent('converges to')
    expect(strong?.querySelector('.katex')).not.toBeNull()
  })

  it('renders inline code opaquely (no katex inside)', () => {
    const { container } = render(
      <>{renderInlineMarkdown('a `f($x$)` b')}</>,
    )
    const code = container.querySelector('code')
    expect(code).toHaveTextContent('f($x$)')
    expect(container.querySelector('.katex')).toBeNull()
  })

  it('keeps math internals out of markdown', () => {
    const { container } = render(<>{renderInlineMarkdown('$a*b*c$')}</>)
    expect(container.querySelector('em')).toBeNull()
    expect(container.querySelector('.katex')).not.toBeNull()
  })

  it('does not throw on a lone $', () => {
    const { container } = render(<>{renderInlineMarkdown('only $5 dollars')}</>)
    expect(container.querySelector('.katex')).toBeNull()
    expect(screen.getByText(/only \$5 dollars/)).toBeInTheDocument()
  })
})
