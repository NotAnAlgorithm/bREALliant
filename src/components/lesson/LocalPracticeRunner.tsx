import { useState } from 'react'

import {
  evaluateProblemFromWidget,
  type EvaluationResult,
} from '../../lib/feedback/feedback-engine'
import type { GradedItem } from '../../lib/review/retrieval-bank'
import { getInitialWidgetState, type WidgetState } from '../../widgets/types'
import { WidgetRenderer } from '../../widgets/registry'
import { RichText } from '../blocks/RichText'
import { FeedbackPanel } from './FeedbackPanel'

/**
 * A self-contained practice runner used for per-lesson "practice more" and the
 * AI-generated beta. It grades each item through the real validator
 * (`evaluateProblemFromWidget`) but is intentionally LOCAL ONLY: it never touches
 * Supabase and never records a review, so nothing it surfaces can move the
 * mastery signal. (Mastery is written only on the dedicated Practice/Review
 * pages via `recordReview`.)
 */
export function LocalPracticeRunner({
  items,
  completionMessage = "Nice — that's all the extra practice for now.",
}: {
  items: GradedItem[]
  completionMessage?: string
}) {
  const [index, setIndex] = useState(0)
  const [states, setStates] = useState<Record<number, WidgetState>>({})
  const [results, setResults] = useState<Record<number, EvaluationResult | null>>({})

  const item = items[index]
  const state = getInitialWidgetState(item.widget, states[index])
  const result = results[index] ?? null
  const solved = result?.correct === true
  const isLast = index === items.length - 1

  const onCheck = () => {
    setResults((prev) => ({
      ...prev,
      [index]: evaluateProblemFromWidget(
        item.validator,
        item.feedback,
        item.widget.kind,
        state,
      ),
    }))
  }

  const onStateChange = (next: WidgetState) => {
    setStates((prev) => ({ ...prev, [index]: next }))
    setResults((prev) => {
      const current = prev[index]
      if (!current || current.correct) return prev
      return { ...prev, [index]: null }
    })
  }

  return (
    <div className="space-y-4 text-left">
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
          <p className="text-sm font-medium text-success">{completionMessage}</p>
        )}
      </div>
    </div>
  )
}
