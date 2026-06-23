import { describe, expect, it } from 'vitest'

import {
  hasLatexDelimiters,
  parseLatexSegments,
  renderMath,
} from './render-math'

describe('renderMath', () => {
  it('renders display math with katex markup', () => {
    const html = renderMath('\\sup E', { displayMode: true })
    expect(html).toContain('katex')
    expect(html).toContain('sup')
  })

  it('does not throw on invalid latex', () => {
    const html = renderMath('\\notacommand', { displayMode: false })
    expect(html).toContain('katex')
  })
})

describe('parseLatexSegments', () => {
  it('parses inline math delimiters', () => {
    const segments = parseLatexSegments('Let $x \\in \\mathbb{R}$ be given.')
    expect(segments).toEqual([
      { kind: 'text', value: 'Let ' },
      { kind: 'math', value: 'x \\in \\mathbb{R}', display: false },
      { kind: 'text', value: ' be given.' },
    ])
  })

  it('detects delimiter presence', () => {
    expect(hasLatexDelimiters('plain text')).toBe(false)
    expect(hasLatexDelimiters('$x$')).toBe(true)
  })
})
