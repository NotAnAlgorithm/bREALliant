import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { loadAllLessons } from '../lib/content/schema-loader'
import {
  evaluateProblemFromWidget,
  type EvaluationResult,
} from '../lib/feedback/feedback-engine'
import {
  buildRetrievalBank,
  pickReviewItem,
  type GradedItem,
} from '../lib/review/retrieval-bank'
import { supabase } from '../lib/supabase'
import { recordReview } from '../services/review'
import { getInitialWidgetState, type WidgetState } from '../widgets/types'
import { WidgetRenderer } from '../widgets/registry'
import { RichText } from '../components/blocks/RichText'
import { FeedbackPanel } from '../components/lesson/FeedbackPanel'
import { useAuth } from '../hooks/useAuth'
import { useDueReviews } from '../hooks/useDueReviews'

type ReviewCard = { tag: string; item: GradedItem }

export function Review() {
  const { user } = useAuth()
  const { due, loading, refresh } = useDueReviews()

  const bank = useMemo(() => buildRetrievalBank(loadAllLessons()), [])

  const cards = useMemo<ReviewCard[]>(() => {
    return due
      .map((concept) => {
        const item = pickReviewItem(bank, concept.tag, concept.reviewLevel)
        return item ? { tag: concept.tag, item } : null
      })
      .filter((card): card is ReviewCard => card !== null)
  }, [due, bank])

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-ink">Review</h1>
          <p className="text-sm text-ink-muted">
            Spaced recall keeps concepts from fading. Answer each from memory.
          </p>
        </div>
        <Link
          to="/practice"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-elevated"
        >
          Mixed practice
        </Link>
      </header>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading your review queue…</p>
      ) : !user ? (
        <p className="text-sm text-ink-muted">
          <Link to="/auth" className="text-brand hover:underline">
            Sign in
          </Link>{' '}
          to track concepts and review them on schedule.
        </p>
      ) : cards.length === 0 ? (
        <AllCaughtUp />
      ) : (
        <ReviewSession
          key={cards.map((c) => c.tag).join('|')}
          cards={cards}
          userId={user.id}
          onComplete={refresh}
        />
      )}
    </section>
  )
}

function AllCaughtUp() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-elevated p-6 text-center">
      <p className="text-base font-medium text-ink">All caught up</p>
      <p className="text-sm text-ink-muted">
        No concepts are due for review right now. Keep sharp with mixed practice,
        or complete more lessons to build your review queue.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to="/practice"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
        >
          Mixed practice
        </Link>
        <Link
          to="/"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-elevated"
        >
          Back to course
        </Link>
      </div>
    </div>
  )
}

function ReviewSession({
  cards,
  userId,
  onComplete,
}: {
  cards: ReviewCard[]
  userId: string
  onComplete: () => void
}) {
  const [index, setIndex] = useState(0)
  const [state, setState] = useState<WidgetState>(() =>
    getInitialWidgetState(cards[0].item.widget),
  )
  const [result, setResult] = useState<EvaluationResult | null>(null)

  const card = cards[index]
  const item = card.item
  const answered = result !== null
  const isLast = index === cards.length - 1

  const onCheck = () => {
    if (answered) return
    const evaluation = evaluateProblemFromWidget(
      item.validator,
      item.feedback,
      item.widget.kind,
      state,
    )
    setResult(evaluation)
    if (supabase) {
      void recordReview(supabase, userId, card.tag, evaluation.correct).catch(
        (error) => console.error('recordReview failed', error),
      )
    }
  }

  const onNext = () => {
    if (isLast) {
      onComplete()
      return
    }
    const next = index + 1
    setIndex(next)
    setState(getInitialWidgetState(cards[next].item.widget))
    setResult(null)
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface-elevated p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">
          Concept {index + 1} of {cards.length}
        </p>
        <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-muted">
          {card.tag}
        </span>
      </div>

      <RichText content={item.prompt} className="text-sm font-medium text-ink" />

      <WidgetRenderer
        kind={item.widget.kind}
        widget={item.widget}
        state={state}
        onStateChange={setState}
        disabled={answered}
      />

      {result ? (
        <FeedbackPanel correct={result.correct} message={result.message} />
      ) : null}

      <div className="flex flex-wrap gap-3">
        {!answered ? (
          <button
            type="button"
            onClick={onCheck}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Check
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-elevated"
          >
            {isLast ? 'Finish review' : 'Next concept'}
          </button>
        )}
      </div>
    </div>
  )
}
