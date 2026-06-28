import { Link } from 'react-router-dom'

import { useDueReviews } from '../../hooks/useDueReviews'

/**
 * Surfaces due spaced reviews on the home screen. Renders nothing when nothing
 * is due, so it stays out of the way until retrieval practice is worthwhile.
 */
export function ReviewBanner() {
  const { dueCount, loading } = useDueReviews()

  if (loading || dueCount === 0) return null

  const label =
    dueCount === 1 ? '1 concept is due for review' : `${dueCount} concepts are due for review`

  return (
    <Link
      to="/review"
      className="flex items-center justify-between gap-4 rounded-xl border border-brand/40 bg-brand/10 px-5 py-4 transition-colors hover:bg-brand/15"
    >
      <div>
        <p className="text-sm font-semibold text-ink">Time to review</p>
        <p className="text-sm text-ink-muted">{label}</p>
      </div>
      <span className="inline-flex min-h-9 items-center rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white">
        Review now
      </span>
    </Link>
  )
}
