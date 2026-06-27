import { useState } from 'react'

import type { QuizItem, Step } from '@content/schemas'
import type { EvaluationResult } from '../../lib/feedback/feedback-engine'
import type { WidgetState } from '../../widgets/types'

import { BlockRenderer } from '../blocks/BlockRenderer'
import { RichText } from '../blocks/RichText'
import { WidgetRenderer } from '../../widgets/registry'
import { FeedbackPanel } from './FeedbackPanel'

const STEP_LABELS: Record<Step['type'], string> = {
  motivation: 'Motivation',
  discover: 'Discover',
  problem: 'Problem',
  summary: 'Summary',
  quiz: 'Quiz',
}

type QuizStep = Extract<Step, { type: 'quiz' }>

type QuizItemHandlers = {
  quizItemState: (itemId: string) => WidgetState
  quizItemResult: (itemId: string) => EvaluationResult | null
  onQuizItemStateChange: (itemId: string, state: WidgetState) => void
  onCheckQuizItem: (itemId: string) => void
}

type HintHandlers = {
  hintsEnabled?: boolean
  hint?: string | null
  hintLoading?: boolean
  hintExhausted?: boolean
  onRequestHint?: () => void
}

type StepRendererProps = {
  step: Step
  widgetState: WidgetState
  onWidgetStateChange: (state: WidgetState) => void
  problemResult?: EvaluationResult | null
  onCheckAnswer?: () => void
} & Partial<QuizItemHandlers> &
  HintHandlers

function isItemGraded(item: QuizItem): boolean {
  return item.validator != null && item.feedback != null
}

export function StepRenderer({
  step,
  widgetState,
  onWidgetStateChange,
  problemResult,
  onCheckAnswer,
  quizItemState,
  quizItemResult,
  onQuizItemStateChange,
  onCheckQuizItem,
  hintsEnabled,
  hint,
  hintLoading,
  hintExhausted,
  onRequestHint,
}: StepRendererProps) {
  const isProblem = step.type === 'problem'

  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-brand">
          {STEP_LABELS[step.type]}
        </p>
      </header>

      {'prompt' in step && step.prompt && (
        <RichText
          content={step.prompt}
          className="text-lg font-medium text-ink"
        />
      )}

      {step.type === 'motivation' || step.type === 'summary' ? (
        <BlockRenderer blocks={step.blocks} />
      ) : null}

      {step.type === 'discover' || step.type === 'problem' ? (
        <WidgetRenderer
          kind={step.widget.kind}
          widget={step.widget}
          state={widgetState}
          onStateChange={onWidgetStateChange}
          disabled={isProblem && problemResult?.correct === true}
        />
      ) : null}

      {isProblem && onCheckAnswer ? (
        <div className="space-y-3">
          {problemResult ? (
            <FeedbackPanel
              correct={problemResult.correct}
              message={problemResult.message}
            />
          ) : null}
          {!problemResult?.correct ? (
            <button
              type="button"
              onClick={onCheckAnswer}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover sm:w-auto"
            >
              Check answer
            </button>
          ) : null}
          {hintsEnabled &&
          onRequestHint &&
          problemResult &&
          !problemResult.correct ? (
            <HintControls
              hint={hint}
              hintLoading={hintLoading}
              hintExhausted={hintExhausted}
              onRequestHint={onRequestHint}
            />
          ) : null}
        </div>
      ) : null}

      {step.type === 'quiz' ? (
        step.items.length > 0 ? (
          <QuizStepRenderer
            step={step}
            quizItemState={quizItemState}
            quizItemResult={quizItemResult}
            onQuizItemStateChange={onQuizItemStateChange}
            onCheckQuizItem={onCheckQuizItem}
          />
        ) : (
          <p className="text-sm text-ink-muted italic">
            Quiz items will appear here when authored.
          </p>
        )
      ) : null}
    </article>
  )
}

type QuizStepRendererProps = {
  step: QuizStep
} & Partial<QuizItemHandlers>

function QuizStepRenderer({
  step,
  quizItemState,
  quizItemResult,
  onQuizItemStateChange,
  onCheckQuizItem,
}: QuizStepRendererProps) {
  const isSatisfied = (item: QuizItem): boolean => {
    if (!isItemGraded(item)) return true
    return quizItemResult?.(item.id)?.correct === true
  }

  const [quizIndex, setQuizIndex] = useState(() => {
    const firstUnanswered = step.items.findIndex((item) => !isSatisfied(item))
    return firstUnanswered === -1 ? 0 : firstUnanswered
  })

  const item = step.items[quizIndex]
  const graded = isItemGraded(item)
  const result = quizItemResult?.(item.id) ?? null
  const state = quizItemState?.(item.id) ?? {}
  const solved = result?.correct === true
  const satisfied = !graded || solved
  const isLastQuestion = quizIndex === step.items.length - 1

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-muted">
        Question {quizIndex + 1} of {step.items.length}
      </p>

      <div className="space-y-3 rounded-xl border border-border bg-surface-elevated p-4">
        <RichText
          content={item.prompt}
          className="text-sm font-medium text-ink"
        />
        <WidgetRenderer
          kind={item.widget.kind}
          widget={item.widget}
          state={state}
          onStateChange={(next) => onQuizItemStateChange?.(item.id, next)}
          disabled={solved}
        />
        {graded ? (
          <div className="space-y-3">
            {result ? (
              <FeedbackPanel
                correct={result.correct}
                message={result.message}
              />
            ) : null}
            {!solved ? (
              <button
                type="button"
                onClick={() => onCheckQuizItem?.(item.id)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover sm:w-auto"
              >
                Check
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {satisfied && !isLastQuestion ? (
        <button
          type="button"
          onClick={() =>
            setQuizIndex((i) => Math.min(step.items.length - 1, i + 1))
          }
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-surface-elevated px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface sm:w-auto"
        >
          Next question
        </button>
      ) : null}
    </div>
  )
}

type HintControlsProps = {
  hint?: string | null
  hintLoading?: boolean
  hintExhausted?: boolean
  onRequestHint: () => void
}

function HintControls({
  hint,
  hintLoading,
  hintExhausted,
  onRequestHint,
}: HintControlsProps) {
  const label = hintLoading
    ? 'Thinking…'
    : hint
      ? 'Another hint'
      : 'Get a hint'

  return (
    <div className="space-y-3">
      {hint ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-3 text-sm leading-relaxed text-ink"
        >
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand">
            Hint
          </p>
          <RichText content={hint} />
        </div>
      ) : null}
      {!hintExhausted ? (
        <button
          type="button"
          onClick={onRequestHint}
          disabled={hintLoading}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand/40 px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {label}
        </button>
      ) : (
        <p className="text-xs text-ink-muted italic">
          That&apos;s all the hints for this one — give it another try.
        </p>
      )}
    </div>
  )
}

export { STEP_LABELS }
