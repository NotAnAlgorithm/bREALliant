import type { Step } from '@content/schemas'
import type { EvaluationResult } from '../../lib/feedback/feedback-engine'
import type { WidgetState } from '../../widgets/types'

import { BlockRenderer } from '../blocks/BlockRenderer'
import { RichText } from '../blocks/RichText'
import { getInitialWidgetState } from '../../widgets/types'
import { WidgetRenderer } from '../../widgets/registry'
import { FeedbackPanel } from './FeedbackPanel'

const STEP_LABELS: Record<Step['type'], string> = {
  motivation: 'Motivation',
  discover: 'Discover',
  problem: 'Problem',
  summary: 'Summary',
  quiz: 'Quiz',
}

type StepRendererProps = {
  step: Step
  widgetState: WidgetState
  onWidgetStateChange: (state: WidgetState) => void
  problemResult?: EvaluationResult | null
  onCheckAnswer?: () => void
}

export function StepRenderer({
  step,
  widgetState,
  onWidgetStateChange,
  problemResult,
  onCheckAnswer,
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
        </div>
      ) : null}

      {step.type === 'quiz' ? (
        step.items.length > 0 ? (
          <ul className="space-y-4">
            {step.items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-border bg-surface-elevated p-4"
              >
                <RichText
                  content={item.prompt}
                  className="mb-3 text-sm font-medium text-ink"
                />
                <WidgetRenderer
                  kind={item.widget.kind}
                  widget={item.widget}
                  state={getInitialWidgetState(item.widget)}
                  onStateChange={() => {}}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted italic">
            Quiz items will appear here when authored.
          </p>
        )
      ) : null}
    </article>
  )
}

export { STEP_LABELS }
