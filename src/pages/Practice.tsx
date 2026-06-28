import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { loadAllLessons } from '../lib/content/schema-loader'
import {
  evaluateProblemFromWidget,
  type EvaluationResult,
} from '../lib/feedback/feedback-engine'
import { buildPracticePools } from '../lib/practice/practice-source'
import {
  buildInterleavedSession,
  type SessionEntry,
} from '../lib/practice/session-builder'
import { buildRetrievalBank, type GradedItem } from '../lib/review/retrieval-bank'
import { supabase } from '../lib/supabase'
import { recordReview } from '../services/review'
import { getInitialWidgetState, type WidgetState } from '../widgets/types'
import { WidgetRenderer } from '../widgets/registry'
import { RichText } from '../components/blocks/RichText'
import { FeedbackPanel } from '../components/lesson/FeedbackPanel'
import { useAuth } from '../hooks/useAuth'
import { useCourseProgress } from '../hooks/useCourseProgress'

const SESSION_LIMIT = 8

export function Practice() {
  const { user } = useAuth()
  const { masteryByTag, loading, refresh } = useCourseProgress()

  const session = useMemo<SessionEntry<GradedItem>[]>(() => {
    const bank = buildRetrievalBank(loadAllLessons())
    const pools = buildPracticePools(masteryByTag, bank)
    return buildInterleavedSession(pools, {
      limit: SESSION_LIMIT,
      kindOf: (item) => item.widget.kind,
    })
  }, [masteryByTag])

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-ink">Mixed practice</h1>
        <p className="text-sm text-ink-muted">
          Problems shuffled across the concepts you&apos;ve practiced. Mixing
          ideas is harder in the moment — and that&apos;s what makes it stick.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-ink-muted">Building your session…</p>
      ) : !user ? (
        <p className="text-sm text-ink-muted">
          <Link to="/auth" className="text-brand hover:underline">
            Sign in
          </Link>{' '}
          to practice across the concepts you&apos;ve learned.
        </p>
      ) : session.length === 0 ? (
        <NothingToPractice />
      ) : (
        <PracticeSession
          key={session.length}
          session={session}
          userId={user.id}
          onComplete={refresh}
        />
      )}
    </section>
  )
}

function NothingToPractice() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-elevated p-6 text-center">
      <p className="text-base font-medium text-ink">No mixed practice yet</p>
      <p className="text-sm text-ink-muted">
        Practice a concept in a lesson first, then it joins your mixed-practice
        pool.
      </p>
      <Link
        to="/"
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-elevated"
      >
        Back to course
      </Link>
    </div>
  )
}

function PracticeSession({
  session,
  userId,
  onComplete,
}: {
  session: SessionEntry<GradedItem>[]
  userId: string
  onComplete: () => void
}) {
  const [index, setIndex] = useState(0)
  const [state, setState] = useState<WidgetState>(() =>
    getInitialWidgetState(session[0].item.widget),
  )
  const [result, setResult] = useState<EvaluationResult | null>(null)

  const entry = session[index]
  const item = entry.item
  const answered = result !== null
  const isLast = index === session.length - 1

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
      void recordReview(supabase, userId, entry.tag, evaluation.correct).catch(
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
    setState(getInitialWidgetState(session[next].item.widget))
    setResult(null)
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface-elevated p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">
          Problem {index + 1} of {session.length}
        </p>
        <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-muted">
          {entry.tag}
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
            {isLast ? 'Finish practice' : 'Next problem'}
          </button>
        )}
      </div>
    </div>
  )
}
