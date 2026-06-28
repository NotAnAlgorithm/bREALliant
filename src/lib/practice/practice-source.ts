// F3.3 — Builds interleaved-practice pools from the learner's mastery and the
// retrieval bank. Pure glue between F1 mastery, the F2 retrieval bank, and the
// F3.2 session builder; eligibility (>= practiced) is enforced downstream by
// buildInterleavedSession.

import type { MasteryStateValue } from '../database.types'
import type { GradedItem, RetrievalBank } from '../review/retrieval-bank'
import type { ConceptPool } from './session-builder'

export function buildPracticePools(
  masteryByTag: ReadonlyMap<string, MasteryStateValue>,
  bank: RetrievalBank,
): ConceptPool<GradedItem>[] {
  const pools: ConceptPool<GradedItem>[] = []
  for (const [tag, items] of bank) {
    if (items.length === 0) continue
    pools.push({ tag, state: masteryByTag.get(tag) ?? 'seen', items })
  }
  // Stable, tag-sorted order keeps sessions deterministic.
  pools.sort((a, b) => a.tag.localeCompare(b.tag))
  return pools
}
