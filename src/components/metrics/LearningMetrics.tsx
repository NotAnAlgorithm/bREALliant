import { type ReactNode, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { useCourseProgress } from '../../hooks/useCourseProgress'
import { useDueReviews } from '../../hooks/useDueReviews'
import { useStreak } from '../../hooks/useStreak'
import { isRetained } from '../../services/mastery'

/**
 * Leads with the metrics that reflect durable learning — concepts retained and
 * how many are due for spaced review — and demotes the streak to a smaller
 * secondary stat. The streak only advances through reviews now, so it reads as
 * a habit indicator rather than the headline number.
 */
export function LearningMetrics() {
  const { masteryByTag } = useCourseProgress()
  const { dueCount } = useDueReviews()
  const { streak } = useStreak()

  const retainedCount = useMemo(
    () => [...masteryByTag.values()].filter((state) => isRetained(state)).length,
    [masteryByTag],
  )

  return (
    <section
      aria-label="Learning summary"
      className="rounded-xl border border-border bg-surface-elevated p-5 shadow-sm"
    >
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <PrimaryMetric label="Concepts retained" value={retainedCount} />
        <PrimaryMetric
          label="Due for review"
          value={dueCount}
          accent={dueCount > 0}
        >
          {dueCount > 0 ? (
            <Link
              to="/review"
              className="text-xs font-medium text-brand hover:underline"
            >
              Review now
            </Link>
          ) : null}
        </PrimaryMetric>
        <div className="col-span-2 flex items-baseline gap-2 sm:col-span-1 sm:flex-col sm:items-start sm:gap-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Day streak
          </dt>
          <dd className="text-base font-semibold text-ink-muted">
            {streak}
            <span className="ml-1 text-xs font-normal text-ink-muted">
              {streak === 1 ? 'day' : 'days'}
            </span>
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-ink-muted">
        Your streak grows each day you clear a review.
      </p>
    </section>
  )
}

function PrimaryMetric({
  label,
  value,
  accent = false,
  children,
}: {
  label: string
  value: number
  accent?: boolean
  children?: ReactNode
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd
        className={`text-3xl font-semibold tabular-nums ${
          accent ? 'text-brand' : 'text-ink'
        }`}
      >
        {value}
      </dd>
      {children}
    </div>
  )
}
