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
})
