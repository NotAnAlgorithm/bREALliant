import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Confetti } from './Confetti'

describe('Confetti', () => {
  it('mounts a decorative overlay with confetti pieces', () => {
    render(<Confetti pieceCount={50} />)
    const overlay = screen.getByTestId('confetti')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getAllByTestId('confetti-piece').length).toBeGreaterThan(0)
  })

  it('renders the requested number of pieces', () => {
    render(<Confetti pieceCount={30} />)
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(30)
  })
})
