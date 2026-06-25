import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useGlossary } from '../../contexts/use-glossary'
import { RichText } from './RichText'

type DefinitionTermProps = {
  termKey: string
  label: string
}

type Position = {
  top: number
  left: number
}

export function DefinitionTerm({ termKey, label }: DefinitionTermProps) {
  const glossary = useGlossary()
  const entry = glossary[termKey]
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return

    const close = () => setOpen(false)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  if (!entry) {
    return <span>{label}</span>
  }

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev
      if (next && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setPosition({ top: rect.bottom + 8, left: rect.left })
      }
      return next
    })
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="cursor-help border-b border-dotted border-brand/60 text-brand"
      >
        {label}
      </button>
      {open
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              style={{ top: position.top, left: position.left }}
              className="fixed z-50 max-w-xs rounded-xl border border-border bg-surface-elevated p-3 text-sm shadow-lg"
            >
              <h3 className="mb-1 font-semibold text-ink">
                {entry.term ?? label}
              </h3>
              <RichText
                content={entry.definition}
                className="text-ink-muted"
              />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
