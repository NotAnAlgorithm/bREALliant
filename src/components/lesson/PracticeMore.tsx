import { useMemo, useState } from 'react'

import { useCourseProgress } from '../../hooks/useCourseProgress'
import {
  loadAllLessons,
  loadPracticeBank,
} from '../../lib/content/schema-loader'
import { buildPracticePools } from '../../lib/practice/practice-source'
import {
  buildInterleavedSession,
  type SessionEntry,
} from '../../lib/practice/session-builder'
import { buildRetrievalBank, type GradedItem } from '../../lib/review/retrieval-bank'
import { GeneratedPracticeBeta } from './GeneratedPracticeBeta'
import { LocalPracticeRunner } from './LocalPracticeRunner'

// The retrieval bank is derived from static content (lessons + curated practice
// bank), so it is built once and shared across every render.
const RETRIEVAL_BANK = buildRetrievalBank(
  loadAllLessons(),
  loadPracticeBank().items,
)

export function PracticeMore({ tags }: { tags: string[] }) {
  const { masteryByTag, loading } = useCourseProgress()
  const [revealed, setRevealed] = useState(false)

  const session = useMemo<SessionEntry<GradedItem>[]>(() => {
    if (tags.length === 0) return []
    const lessonTags = new Set(tags)
    const pools = buildPracticePools(masteryByTag, RETRIEVAL_BANK).filter(
      (pool) => lessonTags.has(pool.tag),
    )
    // No fixed cap: the lesson's concept pools are the natural bound, so a
    // motivated learner can work through every available problem. Multi-tag
    // items are de-duplicated by id so they are never repeated in one session.
    return buildInterleavedSession(pools, {
      kindOf: (item) => item.widget.kind,
      keyOf: (item) => item.id,
    })
  }, [tags, masteryByTag])

  if (tags.length === 0) return null

  const items = session.map((entry) => entry.item)

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border bg-surface-elevated p-5 text-left">
        {revealed && items.length > 0 ? (
          <LocalPracticeRunner items={items} />
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-sm font-medium text-ink">Keep practicing</p>
              <p className="text-sm text-ink-muted">
                A short, interleaved set on the concepts from this lesson — mixed
                and ramped to what you&apos;ve already mastered.
              </p>
            </div>
            {loading ? (
              <p className="text-sm text-ink-muted italic">Loading practice…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-ink-muted italic">
                No extra practice available for this lesson yet.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand/40 px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/10"
              >
                Practice more problems
              </button>
            )}
          </>
        )}
      </div>

      <GeneratedPracticeBeta tags={tags} />
    </div>
  )
}
