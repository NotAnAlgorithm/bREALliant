import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { Lesson } from '@content/schemas'

import { useCourseProgress } from '../../hooks/useCourseProgress'
import { loadAllLessons, loadCourse } from '../../lib/content/schema-loader'
import {
  computeCourseStatuses,
  missingPrerequisites,
  type LessonStatus,
} from '../../services/unlock'

const STATUS_META: Record<
  LessonStatus,
  { label: string; cta: string; tone: string }
> = {
  completed: {
    label: 'Completed',
    cta: 'Review',
    tone: 'text-brand',
  },
  in_progress: {
    label: 'In progress',
    cta: 'Resume',
    tone: 'text-amber-600',
  },
  unlocked: {
    label: 'Ready',
    cta: 'Start',
    tone: 'text-ink-muted',
  },
  locked: {
    label: 'Locked',
    cta: 'Locked',
    tone: 'text-ink-muted',
  },
}

export function CoursePath() {
  const navigate = useNavigate()
  const { completedIds, inProgressIds } = useCourseProgress()

  const course = useMemo(() => loadCourse(), [])
  const lessons = useMemo(() => loadAllLessons(), [])
  const lessonsById = useMemo(
    () => new Map(lessons.map((l) => [l.lessonId, l])),
    [lessons],
  )

  const statuses = useMemo(
    () => computeCourseStatuses(lessons, { completedIds, inProgressIds }),
    [lessons, completedIds, inProgressIds],
  )

  const [pendingLocked, setPendingLocked] = useState<Lesson | null>(null)

  const openLesson = (lessonId: string) => navigate(`/lesson/${lessonId}`)

  const onSelect = (lessonId: string, status: LessonStatus) => {
    if (status === 'locked') {
      const lesson = lessonsById.get(lessonId) ?? null
      setPendingLocked(lesson)
      return
    }
    openLesson(lessonId)
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-brand">
          Real Analysis
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Learn by doing
        </h1>
        <p className="max-w-xl text-ink-muted leading-relaxed">
          Interactive lessons for the foundations of real analysis &mdash;
          guided discovery, instant feedback, and a path through Baby
          Rudin&apos;s early chapters.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-medium text-ink">{course.title}</h2>
        <ol className="space-y-8">
          {course.units.map((unit, unitIndex) => (
            <li key={unit.unitId} className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-ink-muted">
                  Unit {unitIndex + 1}
                </span>
                <h3 className="font-medium text-ink">{unit.title}</h3>
              </div>
              <ul className="space-y-2">
                {unit.lessonIds.map((lessonId) => {
                  const lesson = lessonsById.get(lessonId)
                  const status = statuses.get(lessonId) ?? 'locked'
                  return (
                    <li key={lessonId}>
                      <LessonRow
                        title={lesson?.title ?? lessonId}
                        status={status}
                        onSelect={() => onSelect(lessonId, status)}
                      />
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {pendingLocked ? (
        <PrerequisiteDialog
          lesson={pendingLocked}
          missingTitles={missingPrerequisites(pendingLocked, completedIds).map(
            (id) => lessonsById.get(id)?.title ?? id,
          )}
          onCancel={() => setPendingLocked(null)}
          onConfirm={() => {
            const id = pendingLocked.lessonId
            setPendingLocked(null)
            openLesson(id)
          }}
        />
      ) : null}
    </div>
  )
}

function LessonRow({
  title,
  status,
  onSelect,
}: {
  title: string
  status: LessonStatus
  onSelect: () => void
}) {
  const meta = STATUS_META[status]
  const isLocked = status === 'locked'

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${title} — ${meta.label}`}
      className={[
        'flex min-h-14 w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
        isLocked
          ? 'border-border bg-surface/60 hover:border-border'
          : 'border-border bg-surface hover:border-brand/40 hover:bg-brand/5',
      ].join(' ')}
    >
      <StatusIcon status={status} />
      <span className="min-w-0 flex-1">
        <span
          className={[
            'block truncate text-sm font-medium',
            isLocked ? 'text-ink-muted' : 'text-ink',
          ].join(' ')}
        >
          {title}
        </span>
        <span className={`text-xs ${meta.tone}`}>{meta.label}</span>
      </span>
      <span
        className={[
          'shrink-0 text-xs font-medium',
          isLocked ? 'text-ink-muted' : 'text-brand',
        ].join(' ')}
      >
        {meta.cta}
      </span>
    </button>
  )
}

function StatusIcon({ status }: { status: LessonStatus }) {
  const base = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full'

  if (status === 'completed') {
    return (
      <span className={`${base} bg-brand text-white`} aria-hidden>
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    )
  }

  if (status === 'locked') {
    return (
      <span
        className={`${base} bg-surface-elevated text-ink-muted`}
        aria-hidden
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 1a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4Zm2 6V5a2 2 0 1 0-4 0v2h4Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    )
  }

  // unlocked / in_progress
  return (
    <span
      className={`${base} border-2 ${
        status === 'in_progress'
          ? 'border-amber-500 text-amber-600'
          : 'border-brand/50 text-brand'
      }`}
      aria-hidden
    >
      <span className="h-2 w-2 rounded-full bg-current" />
    </span>
  )
}

function PrerequisiteDialog({
  lesson,
  missingTitles,
  onCancel,
  onConfirm,
}: {
  lesson: Lesson
  missingTitles: string[]
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prereq-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface-elevated p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="prereq-title" className="text-lg font-semibold text-ink">
          Skip the prerequisites?
        </h2>
        <p className="text-sm text-ink-muted">
          <span className="font-medium text-ink">{lesson.title}</span> builds on
          material you haven&apos;t finished yet:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
          {missingTitles.map((title) => (
            <li key={title}>{title}</li>
          ))}
        </ul>
        <p className="text-sm text-ink-muted">
          You can continue anyway, but it may be harder to follow.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-elevated"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  )
}
