import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LatexFragment } from './LatexFragment'

describe('LatexFragment', () => {
  it('renders raw latex without dollar delimiters', () => {
    const { container } = render(<LatexFragment latex="M \\ge " />)
    expect(container.querySelector('.katex')).toBeTruthy()
  })

  it('renders sup notation', () => {
    const { container } = render(<LatexFragment latex="\\sup E = " />)
    expect(container.querySelector('.katex')).toBeTruthy()
  })
})
