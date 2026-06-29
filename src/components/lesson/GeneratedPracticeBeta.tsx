import { useState } from 'react'

import { useCourseProgress } from '../../hooks/useCourseProgress'
import {
  aiGenerationEnabled,
  fetchGeneratedConceptItems,
} from '../../lib/ai/generated-bank'
import type { VerifiedItem } from '../../lib/ai/verify-generated'
import type { GradedItem } from '../../lib/review/retrieval-bank'
import { existingPromptsForTags } from '../../lib/review/shared-bank'
import { LocalPracticeRunner } from './LocalPracticeRunner'

const GENERATED_COUNT = 3

type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

/**
 * Stage 6 beta surface: optional, clearly-labelled AI-generated practice for the
 * current lesson's concepts. Renders nothing unless generation is enabled (flag
 * + Supabase configured). Items are verifier-gated before display and run through
 * {@link LocalPracticeRunner}, which records NO reviews — so this beta never
 * touches the mastery signal.
 */
export function GeneratedPracticeBeta({ tags }: { tags: string[] }) {
  const { masteryByTag } = useCourseProgress()
  const [status, setStatus] = useState<Status>('idle')
  const [items, setItems] = useState<GradedItem[]>([])

  if (!aiGenerationEnabled() || tags.length === 0) return null

  const generate = async () => {
    setStatus('loading')
    const verified = await fetchGeneratedConceptItems(
      tags,
      GENERATED_COUNT,
      masteryHint(tags, masteryByTag),
      existingPromptsForTags(tags),
    )
    const gradeable = verified.filter(
      (item): item is VerifiedItem & GradedItem =>
        item.validator != null && item.feedback != null,
    )
    if (gradeable.length === 0) {
      setStatus('error')
      return
    }
    setItems(gradeable)
    setStatus('ready')
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border bg-surface-elevated p-5 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-ink">Fresh AI practice</p>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand">
          Beta
        </span>
      </div>
      <p className="text-sm text-ink-muted">
        Newly generated conceptual problems on this lesson&apos;s ideas. These are
        experimental and <span className="font-medium">don&apos;t affect your mastery</span>
        — every one is still checked before you see it.
      </p>

      {status === 'ready' && items.length > 0 ? (
        <LocalPracticeRunner
          key={items.map((i) => i.id).join('|')}
          items={items}
          completionMessage="That's the generated set — want another?"
        />
      ) : null}

      {status === 'loading' ? (
        <p className="text-sm text-ink-muted italic">Generating fresh problems…</p>
      ) : null}

      {status === 'error' ? (
        <p className="text-sm text-ink-muted italic">
          Couldn&apos;t generate problems right now. Try again in a moment.
        </p>
      ) : null}

      <button
        type="button"
        onClick={generate}
        disabled={status === 'loading'}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand/40 px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/10 disabled:opacity-50"
      >
        {status === 'idle'
          ? 'Generate practice'
          : status === 'loading'
            ? 'Generating…'
            : 'Generate a new set'}
      </button>
    </div>
  )
}

/** Coarse difficulty steer: the most common mastery state across the lesson's tags. */
function masteryHint(
  tags: string[],
  masteryByTag: ReadonlyMap<string, string>,
): string | undefined {
  const counts = new Map<string, number>()
  for (const tag of tags) {
    const state = masteryByTag.get(tag)
    if (state) counts.set(state, (counts.get(state) ?? 0) + 1)
  }
  let best: string | undefined
  let bestCount = 0
  for (const [state, count] of counts) {
    if (count > bestCount) {
      best = state
      bestCount = count
    }
  }
  return best ? `the learner is at "${best}" mastery on most of these concepts` : undefined
}
