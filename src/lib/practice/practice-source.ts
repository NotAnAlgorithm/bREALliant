// F3.3 — Builds interleaved-practice pools from the learner's mastery and the
// retrieval bank. Pure glue between F1 mastery, the F2 retrieval bank, and the
// F3.2 session builder; eligibility (>= practiced) is enforced downstream by
// buildInterleavedSession.

import type { MasteryStateValue } from '../database.types'
import { itemDifficulty, orderByDifficulty } from '../review/difficulty'
import type { GradedItem, RetrievalBank } from '../review/retrieval-bank'
import type { ConceptPool } from './session-builder'

export function buildPracticePools(
  masteryByTag: ReadonlyMap<string, MasteryStateValue>,
  bank: RetrievalBank,
): ConceptPool<GradedItem>[] {
  const pools: ConceptPool<GradedItem>[] = []
  for (const [tag, items] of bank) {
    if (items.length === 0) continue
    const state = masteryByTag.get(tag) ?? 'seen'
    // Order each concept's items by the difficulty ramp for its mastery state,
    // so the round-robin session builder draws the most appropriate difficulty
    // first.
    pools.push({
      tag,
      state,
      items: orderByDifficulty(items, state, itemDifficulty),
    })
  }
  // Stable, tag-sorted order keeps sessions deterministic.
  pools.sort((a, b) => a.tag.localeCompare(b.tag))
  return pools
}
