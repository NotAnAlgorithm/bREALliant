import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import type { WidgetComponentProps } from '../types'
import { RichText } from '../../components/blocks/RichText'
import { parseDragOrderProps } from './utils'
import './drag-order.css'

const FLIP_DURATION_MS = 220

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function DragOrderWidget({
  widget,
  state,
  onStateChange,
  disabled = false,
}: WidgetComponentProps) {
  const { items } = parseDragOrderProps(widget.props)
  const labelById = new Map(items.map((item) => [item.id, item.label]))

  const order = useMemo(() => {
    const stateOrder = Array.isArray(state.order)
      ? state.order.filter((id): id is string => typeof id === 'string')
      : []
    // Keep only known ids, then append any missing ones to stay robust.
    const known = stateOrder.filter((id) => labelById.has(id))
    const missing = items.map((i) => i.id).filter((id) => !known.includes(id))
    return known.length > 0 || missing.length > 0 ? [...known, ...missing] : []
    // labelById/items derive from widget.props; key the memo on the raw inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.order, widget.props])

  // Live element refs keyed by item id, used for FLIP measurements.
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map())
  // Each id's top offset recorded at the previous layout pass.
  const prevRectsRef = useRef<Map<string, number>>(new Map())

  const [movedId, setMovedId] = useState<string | null>(null)
  const movedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= order.length) return
    const next = [...order]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setMovedId(moved)
    onStateChange({ order: next })
  }

  // FLIP: after the order prop changes, invert each moved row to its old
  // position with no transition, then play it back to the new position.
  useLayoutEffect(() => {
    const prevRects = prevRectsRef.current
    const nextRects = new Map<string, number>()
    const reduceMotion = prefersReducedMotion()

    for (const id of order) {
      const el = rowRefs.current.get(id)
      if (!el) continue
      const newTop = el.getBoundingClientRect().top
      nextRects.set(id, newTop)

      if (reduceMotion) continue

      const oldTop = prevRects.get(id)
      if (oldTop === undefined) continue
      const delta = oldTop - newTop
      // jsdom has no layout, so deltas are always 0 there — this is a no-op.
      if (delta === 0) continue

      // Invert: jump back to the old position with no transition.
      el.classList.remove('drag-order-row-animating')
      el.style.transform = `translateY(${delta}px)`
      // Force reflow so the inverted transform is committed before we play.
      void el.offsetHeight
      // Play: transition back to the natural position.
      el.classList.add('drag-order-row-animating')
      el.style.transform = ''
    }

    prevRectsRef.current = nextRects
  }, [order])

  // Clear the move highlight after a short delay.
  useLayoutEffect(() => {
    if (movedId === null) return
    if (movedTimerRef.current !== null) clearTimeout(movedTimerRef.current)
    movedTimerRef.current = setTimeout(() => setMovedId(null), FLIP_DURATION_MS * 3)
    return () => {
      if (movedTimerRef.current !== null) clearTimeout(movedTimerRef.current)
    }
  }, [movedId])

  return (
    <ol className="flex flex-col gap-2" data-widget="drag_order">
      {order.map((id, index) => {
        const label = labelById.get(id) ?? ''
        return (
          <li
            key={id}
            ref={(el) => {
              if (el) rowRefs.current.set(id, el)
              else rowRefs.current.delete(id)
            }}
            className={`flex items-center gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3${
              id === movedId ? ' drag-order-row-moved' : ''
            }`}
          >
            <span className="font-mono text-sm text-ink-muted">
              {index + 1}.
            </span>
            <div className="min-w-0 flex-1">
              <RichText content={label} className="text-sm text-ink" />
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                disabled={disabled || index === 0}
                aria-label={`Move "${label}" up`}
                onClick={() => move(index, -1)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface text-ink transition-colors hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span aria-hidden="true">↑</span>
              </button>
              <button
                type="button"
                disabled={disabled || index === order.length - 1}
                aria-label={`Move "${label}" down`}
                onClick={() => move(index, 1)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface text-ink transition-colors hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span aria-hidden="true">↓</span>
              </button>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
