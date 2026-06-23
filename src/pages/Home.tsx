import { Link } from 'react-router-dom'

import { loadAllLessons, loadCourse } from '../lib/content/schema-loader'

export function Home() {
  const course = loadCourse()
  const lessons = loadAllLessons()
  const lessonTitles = new Map(lessons.map((l) => [l.lessonId, l.title]))

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
          Interactive lessons for the foundations of real analysis — guided
          discovery, instant feedback, and a path through Baby Rudin&apos;s
          early chapters.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-surface-elevated p-6 shadow-sm">
        <h2 className="text-lg font-medium text-ink">{course.title}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Loaded from{' '}
          <code className="rounded bg-surface px-1">content/fixtures/</code>
        </p>
        <ul className="mt-4 space-y-4">
          {course.units.map((unit) => (
            <li key={unit.unitId}>
              <h3 className="font-medium text-ink">{unit.title}</h3>
              <ul className="mt-2 space-y-2">
                {unit.lessonIds.map((id) => (
                  <li key={id}>
                    <Link
                      to={`/lesson/${id}`}
                      className="flex min-h-11 items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm transition-colors hover:border-brand/40 hover:bg-brand/5"
                    >
                      <span className="font-medium text-ink">
                        {lessonTitles.get(id) ?? id}
                      </span>
                      <span className="text-xs text-ink-muted">{id}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
