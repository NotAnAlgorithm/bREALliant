import { useEffect, useMemo, useState, type CSSProperties } from 'react'

import './Confetti.css'

const PALETTE = [
  'var(--color-brand, #2563eb)',
  '#22c55e',
  '#16a34a',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
]

type ConfettiPiece = {
  id: number
  style: CSSProperties
}

export type ConfettiProps = {
  /** How long the burst lives before it unmounts its pieces. */
  durationMs?: number
  /** Number of confetti pieces to render. */
  pieceCount?: number
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function buildPieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, id) => {
    const x = Math.random() * 100
    const drift = (Math.random() - 0.5) * 40
    const size = 6 + Math.random() * 8
    const rotate = 360 + Math.random() * 720
    const delay = Math.random() * 0.6
    const duration = 1.8 + Math.random() * 1.6
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]

    const style: CSSProperties = {
      '--x': `${x}vw`,
      '--drift': `${drift}vw`,
      '--size': `${size}px`,
      '--rotate': `${rotate}deg`,
      '--delay': `${delay}s`,
      '--duration': `${duration}s`,
      '--color': color,
    } as CSSProperties

    return { id, style }
  })
}

export function Confetti({ durationMs = 2500, pieceCount = 90 }: ConfettiProps) {
  const reducedMotion = prefersReducedMotion()
  const [visible, setVisible] = useState(true)

  const pieces = useMemo(
    () => (reducedMotion ? [] : buildPieces(pieceCount)),
    [reducedMotion, pieceCount],
  )

  useEffect(() => {
    if (reducedMotion) return
    const timer = setTimeout(() => setVisible(false), durationMs)
    return () => clearTimeout(timer)
  }, [reducedMotion, durationMs])

  if (reducedMotion || !visible) return null

  return (
    <div className="confetti-overlay" data-testid="confetti" aria-hidden="true">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          data-testid="confetti-piece"
          style={piece.style}
        />
      ))}
    </div>
  )
}
