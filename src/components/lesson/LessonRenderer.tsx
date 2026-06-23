import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import type { Lesson } from '@content/schemas'

import { getInitialWidgetState, type WidgetState } from '../../widgets/types'
import { STEP_LABELS, StepRenderer } from './StepRenderer'
import { StepProgress } from './StepProgress'

type LessonRendererProps = {
  lesson: Lesson
}

function getStepWidget(step: Lesson['steps'][number]) {
  if (step.type === 'discover' || step.type === 'problem') {
    return step.widget
  }
  return null
}

export function LessonRenderer({ lesson }: LessonRendererProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [stepStates, setStepStates] = useState<Record<string, WidgetState>>({})

  const step = lesson.steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === lesson.steps.length - 1

  const stepLabels = lesson.steps.map((s) => STEP_LABELS[s.type])

  const currentWidget = step ? getStepWidget(step) : null
  const widgetState = useMemo(() => {
    if (!step || !currentWidget) return {}
    return getInitialWidgetState(currentWidget, stepStates[step.id])
  }, [step, currentWidget, stepStates])

  const onWidgetStateChange = useCallback(
    (state: WidgetState) => {
      if (!step) return
      setStepStates((prev) => ({ ...prev, [step.id]: state }))
    },
    [step],
  )

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(lesson.steps.length - 1, i + 1))
  }, [lesson.steps.length])

  if (!step) {
    return null
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center text-sm text-ink-muted transition-colors hover:text-brand"
        >
          ← Course path
        </Link>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {lesson.title}
          </h1>
          {lesson.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {lesson.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <StepProgress
          currentIndex={stepIndex}
          total={lesson.steps.length}
          stepLabels={stepLabels}
        />
      </header>

      <StepRenderer
        step={step}
        widgetState={widgetState}
        onWidgetStateChange={onWidgetStateChange}
      />

      <footer className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={isFirst}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface-elevated px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        {isLast ? (
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Finish lesson
          </Link>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Continue
          </button>
        )}
      </footer>
    </div>
  )
}
