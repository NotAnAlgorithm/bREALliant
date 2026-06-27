import { useCallback, useState } from 'react'

import { getGeneratedItems } from '../../lib/ai/generated-bank'
import type { VerifiedItem } from '../../lib/ai/verify-generated'
import {
  evaluateProblemFromWidget,
  type EvaluationResult,
} from '../../lib/feedback/feedback-engine'
import { getInitialWidgetState, type WidgetState } from '../../widgets/types'
import { WidgetRenderer } from '../../widgets/registry'
import { RichText } from '../blocks/RichText'
import { FeedbackPanel } from './FeedbackPanel'

const MAX_ITEMS = 5
const PER_TAG = 2

/** Deterministic, non-crypto seed from a tag so each concept yields distinct numbers. */
function seedFromTag(tag: string): number {
  let h = 2166136261
  for (let i = 0; i < tag.length; i += 1) {
    h ^= tag.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

async function collectItems(tags: string[]): Promise<VerifiedItem[]> {
  const batches = await Promise.all(
    tags.map((tag) => getGeneratedItems(tag, PER_TAG, seedFromTag(tag))),
  )
  const seen = new Set<string>()
  const unique: VerifiedItem[] = []
  for (const item of batches.flat()) {
    if (seen.has(item.prompt)) continue
    seen.add(item.prompt)
    unique.push(item)
    if (unique.length >= MAX_ITEMS) break
  }
  return unique
}

type LoadState = 'idle' | 'loading' | 'ready' | 'empty'

export function PracticeMore({ tags }: { tags: string[] }) {
  const [status, setStatus] = useState<LoadState>('idle')
  const [items, setItems] = useState<VerifiedItem[]>([])

  const load = useCallback(async () => {
    setStatus('loading')
    const collected = await collectItems(tags)
    if (collected.length === 0) {
      setStatus('empty')
      return
    }
    setItems(collected)
    setStatus('ready')
  }, [tags])

  if (tags.length === 0) return null

  if (status === 'ready') {
    return <PracticeRunner items={items} />
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-elevated p-5 text-left">
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">Keep practicing</p>
        <p className="text-sm text-ink-muted">
          Fresh problems on the same ideas — each one checked for a correct answer
          before it&apos;s shown.
        </p>
      </div>
      {status === 'empty' ? (
        <p className="text-sm text-ink-muted italic">
          No extra practice available for this lesson yet.
        </p>
      ) : (
        <button
          type="button"
          onClick={load}
          disabled={status === 'loading'}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand/40 px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'loading' ? 'Loading…' : 'Practice more problems'}
        </button>
      )}
    </div>
  )
}

function PracticeRunner({ items }: { items: VerifiedItem[] }) {
  const [index, setIndex] = useState(0)
  const [states, setStates] = useState<Record<string, WidgetState>>({})
  const [results, setResults] = useState<
    Record<string, EvaluationResult | null>
  >({})

  const item = items[index]
  const state = getInitialWidgetState(item.widget, states[item.id])
  const result = results[item.id] ?? null
  const solved = result?.correct === true
  const isLast = index === items.length - 1

  const onCheck = () => {
    if (!item.validator || !item.feedback) return
    setResults((prev) => ({
      ...prev,
      [item.id]: evaluateProblemFromWidget(
        item.validator!,
        item.feedback!,
        item.widget.kind,
        state,
      ),
    }))
  }

  const onStateChange = (next: WidgetState) => {
    setStates((prev) => ({ ...prev, [item.id]: next }))
    setResults((prev) => {
      const current = prev[item.id]
      if (!current || current.correct) return prev
      return { ...prev, [item.id]: null }
    })
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface-elevated p-5 text-left">
      <p className="text-xs text-ink-muted">
        Practice {index + 1} of {items.length}
      </p>

      <RichText content={item.prompt} className="text-sm font-medium text-ink" />

      <WidgetRenderer
        kind={item.widget.kind}
        widget={item.widget}
        state={state}
        onStateChange={onStateChange}
        disabled={solved}
      />

      {result ? (
        <FeedbackPanel correct={result.correct} message={result.message} />
      ) : null}

      <div className="flex flex-wrap gap-3">
        {!solved ? (
          <button
            type="button"
            onClick={onCheck}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Check
          </button>
        ) : !isLast ? (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-elevated"
          >
            Next problem
          </button>
        ) : (
          <p className="text-sm font-medium text-success">
            Nice — that&apos;s all the extra practice for now.
          </p>
        )}
      </div>
    </div>
  )
}
