import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BlockRenderer } from './BlockRenderer'

describe('BlockRenderer', () => {
  it('renders text blocks', () => {
    render(
      <BlockRenderer
        blocks={[{ type: 'text', content: 'Hello real analysis.' }]}
      />,
    )
    expect(screen.getByText('Hello real analysis.')).toBeInTheDocument()
  })

  it('renders math blocks with KaTeX', () => {
    const { container } = render(
      <BlockRenderer blocks={[{ type: 'math', latex: '\\sup E' }]} />,
    )
    expect(container.querySelector('.katex-display')).toBeTruthy()
    expect(container.querySelector('.katex-html')).toBeTruthy()
  })
})
