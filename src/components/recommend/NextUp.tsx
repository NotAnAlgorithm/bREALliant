import { Link } from 'react-router-dom'

import { useRecommendation } from '../../hooks/useRecommendation'
import type { RecommendationKind } from '../../lib/recommend/next-up'

const KIND_EYEBROW: Record<RecommendationKind, string> = {
  review: 'Review',
  remediate: 'Shore up',
  continue: 'Up next',
  practice: 'Practice',
  caught_up: 'All caught up',
}

/**
 * The single most valuable next action for the learner, chosen by the adaptive
 * recommender. Sits at the top of Home as the primary call to action.
 */
export function NextUp() {
  const { recommendation, loading } = useRecommendation()

  if (loading || !recommendation) return null

  return (
    <section
      aria-label="Recommended next step"
      className="rounded-xl border border-brand/40 bg-brand/10 px-5 py-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">
        {KIND_EYEBROW[recommendation.kind]}
      </p>
      <div className="mt-1 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink">
            {recommendation.title}
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {recommendation.reason}
          </p>
        </div>
        {recommendation.cta ? (
          <Link
            to={recommendation.href}
            className="inline-flex min-h-9 shrink-0 items-center rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand/90"
          >
            {recommendation.cta}
          </Link>
        ) : null}
      </div>
    </section>
  )
}
