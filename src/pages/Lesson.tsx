import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import type { Lesson as LessonType } from '@content/schemas'

import { LessonRenderer } from '../components/lesson/LessonRenderer'
import { useCourseProgress } from '../hooks/useCourseProgress'
import {
  getAvailableLessonIds,
  loadAllLessons,
  tryLoadLesson,
} from '../lib/content/schema-loader'
import { isLessonUnlocked, missingPrerequisites } from '../services/unlock'

type LessonLocationState = { bypassPrereqGate?: boolean } | null

export function Lesson() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const location = useLocation()
  const { completedIds, loading } = useCourseProgress()
  const [override, setOverride] = useState(false)

  const lesson = lessonId ? tryLoadLesson(lessonId) : null

  if (!lessonId) {
    return <LessonNotFound message="No lesson specified." />
  }

  if (!lesson) {
    return <LessonNotFound lessonId={lessonId} />
  }

  const bypass = Boolean(
    (location.state as LessonLocationState)?.bypassPrereqGate,
  )

  const shouldGate =
    !override &&
    !bypass &&
    !completedIds.has(lesson.lessonId) &&
    !isLessonUnlocked(lesson, completedIds)

  // While progress is loading we can't yet tell whether a prerequisite-bearing
  // lesson is locked, so wait before deciding (avoids flashing the lesson).
  if (loading && shouldGate) {
    return <p className="text-center text-sm text-ink-muted">Loading…</p>
  }

  if (shouldGate) {
    const lessonsById = new Map(loadAllLessons().map((l) => [l.lessonId, l]))
    const missingTitles = missingPrerequisites(lesson, completedIds).map(
      (id) => lessonsById.get(id)?.title ?? id,
    )
    return (
      <PrerequisiteGate
        lesson={lesson}
        missingTitles={missingTitles}
        onContinue={() => setOverride(true)}
      />
    )
  }

  return <LessonRenderer lesson={lesson} />
}

function PrerequisiteGate({
  lesson,
  missingTitles,
  onContinue,
}: {
  lesson: LessonType
  missingTitles: string[]
  onContinue: () => void
}) {
  return (
    <div className="mx-auto max-w-lg space-y-6 py-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-elevated text-ink-muted">
        <svg viewBox="0 0 20 20" className="h-7 w-7" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 1a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4Zm2 6V5a2 2 0 1 0-4 0v2h4Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-ink">
          Prerequisites not finished
        </h1>
        <p className="text-sm text-ink-muted">
          <span className="font-medium text-ink">{lesson.title}</span> builds on
          material you haven&apos;t completed yet:
        </p>
      </div>
      <ul className="mx-auto inline-block list-disc space-y-1 pl-5 text-left text-sm text-ink-muted">
        {missingTitles.map((title) => (
          <li key={title}>{title}</li>
        ))}
      </ul>
      <p className="text-sm text-ink-muted">
        You can continue anyway, but it may be harder to follow.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface-elevated px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
        >
          Back to course path
        </Link>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
        >
          Continue anyway
        </button>
      </div>
    </div>
  )
}

function LessonNotFound({
  lessonId,
  message,
}: {
  lessonId?: string
  message?: string
}) {
  const available = getAvailableLessonIds()

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold text-ink">Lesson not found</h1>
      <p className="text-sm text-ink-muted">
        {message ?? `"${lessonId}" is not in the content bundle.`}
      </p>
      {available.length > 0 && (
        <ul className="space-y-2 text-sm">
          {available.map((id) => (
            <li key={id}>
              <Link to={`/lesson/${id}`} className="text-brand hover:underline">
                {id}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/" className="inline-block text-sm text-brand hover:underline">
        ← Back to course path
      </Link>
    </div>
  )
}
