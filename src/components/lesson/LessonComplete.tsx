import { Link } from 'react-router-dom'

import { Confetti } from './Confetti'

export type LessonCompleteData = {
  lessonTitle: string
  streak: number | null
  unlockedTitles: string[]
  nextLessonId: string | null
  nextLessonTitle: string | null
  unitComplete: boolean
  courseComplete: boolean
}

export function LessonComplete({
  lessonTitle,
  streak,
  unlockedTitles,
  nextLessonId,
  nextLessonTitle,
  unitComplete,
  courseComplete,
}: LessonCompleteData) {
  const milestone = courseComplete
    ? 'Course complete!'
    : unitComplete
      ? 'Unit complete!'
      : 'Lesson complete!'

  const confetti = courseComplete
    ? { pieceCount: 160, durationMs: 4000 }
    : unitComplete
      ? { pieceCount: 120, durationMs: 3200 }
      : { pieceCount: 90, durationMs: 2500 }

  return (
    <div className="mx-auto max-w-lg space-y-8 py-6 text-center">
      <Confetti
        pieceCount={confetti.pieceCount}
        durationMs={confetti.durationMs}
      />
      <div className="space-y-3">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white">
          <svg viewBox="0 0 20 20" className="h-8 w-8" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {milestone}
        </h1>
        <p className="text-ink-muted">
          You finished{' '}
          <span className="font-medium text-ink">{lessonTitle}</span>.
        </p>
      </div>

      {streak !== null && streak > 0 ? (
        <p className="inline-flex items-center justify-center rounded-full bg-brand/10 px-4 py-1.5 text-sm font-medium text-brand">
          {streak} day streak
        </p>
      ) : null}

      {unlockedTitles.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-border bg-surface-elevated p-5 text-left">
          <p className="text-sm font-medium text-ink">You unlocked</p>
          <ul className="space-y-1 text-sm text-ink-muted">
            {unlockedTitles.map((title) => (
              <li key={title} className="flex items-center gap-2">
                <span className="text-brand">+</span>
                {title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {courseComplete ? (
        <p className="text-sm text-ink-muted">
          You&apos;ve completed every lesson in the course. Nicely done.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        {nextLessonId ? (
          <Link
            to={`/lesson/${nextLessonId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            {nextLessonTitle ? `Next: ${nextLessonTitle}` : 'Next lesson'}
          </Link>
        ) : null}
        <Link
          to="/"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface-elevated px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
        >
          Back to course path
        </Link>
      </div>
    </div>
  )
}
