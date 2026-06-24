import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import type { Lesson } from '@content/schemas'

import { useAuth } from '../../hooks/useAuth'
import { loadAllLessons, loadCourse } from '../../lib/content/schema-loader'
import {
  evaluateProblemFromWidget,
  type EvaluationResult,
} from '../../lib/feedback/feedback-engine'
import { supabase } from '../../lib/supabase'
import {
  completeLesson,
  loadCourseProgress,
  loadLessonProgress,
  loadStreak,
  saveLessonProgress,
} from '../../services/progress'
import {
  flattenLessonIds,
  isCourseComplete,
  isUnitComplete,
  lessonsUnlockedBy,
  pickNextLesson,
} from '../../services/unlock'
import { getInitialWidgetState, type WidgetState } from '../../widgets/types'
import { LessonComplete, type LessonCompleteData } from './LessonComplete'
import { STEP_LABELS, StepRenderer } from './StepRenderer'
import { StepProgress } from './StepProgress'

type LessonRendererProps = {
  lesson: Lesson
}

type StepAttemptMap = Record<string, EvaluationResult | undefined>

function getStepWidget(step: Lesson['steps'][number]) {
  if (step.type === 'discover' || step.type === 'problem') {
    return step.widget
  }
  return null
}

function canAdvanceFromStep(
  step: Lesson['steps'][number],
  attempts: StepAttemptMap,
): boolean {
  if (step.type === 'problem') {
    return attempts[step.id]?.correct === true
  }
  return true
}

export function LessonRenderer({ lesson }: LessonRendererProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stepIndex, setStepIndex] = useState(0)
  const [stepStates, setStepStates] = useState<Record<string, WidgetState>>({})
  const [stepAttempts, setStepAttempts] = useState<StepAttemptMap>({})
  const [hydrated, setHydrated] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [completion, setCompletion] = useState<LessonCompleteData | null>(null)
  const skipNextSave = useRef(false)

  const step = lesson.steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === lesson.steps.length - 1

  const stepLabels = lesson.steps.map((s) => STEP_LABELS[s.type])

  const currentWidget = step ? getStepWidget(step) : null
  const widgetState = useMemo(() => {
    if (!step || !currentWidget) return {}
    return getInitialWidgetState(currentWidget, stepStates[step.id])
  }, [step, currentWidget, stepStates])

  const problemResult =
    step?.type === 'problem' ? (stepAttempts[step.id] ?? null) : null

  const canContinue = step ? canAdvanceFromStep(step, stepAttempts) : true

  useEffect(() => {
    if (!user || !supabase) {
      void Promise.resolve().then(() => setHydrated(true))
      return
    }

    let cancelled = false

    loadLessonProgress(supabase, user.id, lesson.lessonId)
      .then((snapshot) => {
        if (cancelled || !snapshot) return
        skipNextSave.current = true
        setStepIndex(snapshot.stepIndex)
        setStepStates(snapshot.stepStates)
        setStepAttempts(snapshot.stepAttempts)
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [user, lesson.lessonId])

  useEffect(() => {
    if (!hydrated || !user || !supabase || !step) return

    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    const timeout = window.setTimeout(() => {
      if (!supabase) return
      saveLessonProgress(supabase, user.id, lesson.lessonId, {
        stepIndex,
        stepId: step.id,
        stepState: widgetState,
        stepStates,
        stepAttempts: Object.fromEntries(
          Object.entries(stepAttempts).filter(([, v]) => v !== undefined),
        ) as Record<string, { correct: boolean; message: string }>,
        completed: false,
      }).catch(console.error)
    }, 400)

    return () => window.clearTimeout(timeout)
  }, [
    hydrated,
    user,
    lesson.lessonId,
    step,
    stepIndex,
    stepStates,
    stepAttempts,
    widgetState,
  ])

  const onWidgetStateChange = useCallback(
    (state: WidgetState) => {
      if (!step) return
      setStepStates((prev) => ({ ...prev, [step.id]: state }))
      if (step.type === 'problem') {
        setStepAttempts((prev) => {
          const current = prev[step.id]
          if (!current || current.correct) return prev
          return { ...prev, [step.id]: undefined }
        })
      }
    },
    [step],
  )

  const onCheckAnswer = useCallback(() => {
    if (!step || step.type !== 'problem') return
    const result = evaluateProblemFromWidget(
      step.validator,
      step.feedback,
      step.widget.kind,
      widgetState,
    )
    setStepAttempts((prev) => ({ ...prev, [step.id]: result }))
  }, [step, widgetState])

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    if (!step || !canAdvanceFromStep(step, stepAttempts)) return
    setStepIndex((i) => Math.min(lesson.steps.length - 1, i + 1))
  }, [lesson.steps.length, step, stepAttempts])

  const handleFinish = useCallback(async () => {
    if (!step || !canAdvanceFromStep(step, stepAttempts)) return
    setFinishing(true)
    try {
      if (!user || !supabase) {
        navigate('/')
        return
      }

      await saveLessonProgress(supabase, user.id, lesson.lessonId, {
        stepIndex,
        stepId: step.id,
        stepState: widgetState,
        stepStates,
        stepAttempts: Object.fromEntries(
          Object.entries(stepAttempts).filter(([, v]) => v !== undefined),
        ) as Record<string, { correct: boolean; message: string }>,
        completed: true,
      })
      await completeLesson(supabase, user.id, lesson.lessonId, lesson.tags)

      const course = loadCourse()
      const allLessons = loadAllLessons()
      const lessonsById = new Map(allLessons.map((l) => [l.lessonId, l]))

      const summary = await loadCourseProgress(supabase, user.id)
      const completedSet = new Set(summary.completedIds)
      completedSet.add(lesson.lessonId)

      const unlockedIds = lessonsUnlockedBy(
        lesson.lessonId,
        allLessons,
        completedSet,
      )
      const nextLessonId =
        unlockedIds[0] ??
        pickNextLesson(
          flattenLessonIds(course),
          lessonsById,
          completedSet,
          lesson.lessonId,
        )

      let streak: number | null = null
      try {
        streak = await loadStreak(supabase, user.id)
      } catch (streakError) {
        console.error(streakError)
      }

      setCompletion({
        lessonTitle: lesson.title,
        streak,
        unlockedTitles: unlockedIds.map(
          (id) => lessonsById.get(id)?.title ?? id,
        ),
        nextLessonId: nextLessonId ?? null,
        nextLessonTitle: nextLessonId
          ? (lessonsById.get(nextLessonId)?.title ?? null)
          : null,
        unitComplete: course.units.some(
          (unit) =>
            unit.lessonIds.includes(lesson.lessonId) &&
            isUnitComplete(unit, completedSet),
        ),
        courseComplete: isCourseComplete(course, completedSet),
      })
    } catch (error) {
      console.error(error)
    } finally {
      setFinishing(false)
    }
  }, [
    step,
    stepAttempts,
    stepIndex,
    stepStates,
    widgetState,
    user,
    lesson.lessonId,
    lesson.tags,
    lesson.title,
    navigate,
  ])

  if (completion) {
    return <LessonComplete {...completion} />
  }

  if (!step) {
    return null
  }

  if (!hydrated && user) {
    return (
      <p className="text-center text-sm text-ink-muted">Loading progress…</p>
    )
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
        problemResult={problemResult}
        onCheckAnswer={step.type === 'problem' ? onCheckAnswer : undefined}
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
          <button
            type="button"
            onClick={handleFinish}
            disabled={!canContinue || finishing}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {finishing ? 'Saving…' : 'Finish lesson'}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={!canContinue}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        )}
      </footer>

      {step.type === 'problem' && !canContinue ? (
        <p className="text-center text-xs text-ink-muted">
          Answer correctly to continue.
        </p>
      ) : null}
    </div>
  )
}
