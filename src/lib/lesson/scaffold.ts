// F4.3 — Fading-scaffold selection (pure).
//
// Worked-example-first: a learner new to a concept sees the full worked
// solution; as mastery grows the scaffold fades (completion -> bare). This
// mirrors the worked-example effect and the expertise-reversal effect — heavy
// scaffolding helps novices but hinders experts (Sweller; Kalyuga).

import type { MasteryState } from '../../services/mastery'
import type { ScaffoldLevel } from '@content/schemas'

export type { ScaffoldLevel }

/** Success rate at/above which a learner is treated as fluent enough for no scaffold. */
export const SUCCESS_THRESHOLD = 0.8

const STATE_RANK: Record<MasteryState, number> = {
  seen: 0,
  practiced: 1,
  retained: 2,
  fluent: 3,
}

/**
 * The weakest (least-mastered) state among a step's tags drives scaffolding: a
 * problem is only "easy" once every concept it touches is solid.
 */
export function weakestState(
  tags: readonly string[],
  masteryByTag: ReadonlyMap<string, MasteryState>,
): MasteryState {
  let weakest: MasteryState | null = null
  for (const tag of tags) {
    const state = masteryByTag.get(tag) ?? 'seen'
    if (weakest === null || STATE_RANK[state] < STATE_RANK[weakest]) {
      weakest = state
    }
  }
  return weakest ?? 'seen'
}

export type ScaffoldInput = {
  /** Learner's (weakest) mastery state for the problem's concepts. */
  state?: MasteryState
  /** Recent success rate on this concept, if tracked (0..1). */
  successRate?: number
  /** Author-declared default level when mastery is unknown. */
  authored?: ScaffoldLevel
}

export function selectScaffold({
  state,
  successRate,
  authored,
}: ScaffoldInput): ScaffoldLevel {
  // Demonstrated fluency removes the scaffold regardless of stored state.
  if (successRate != null && successRate >= SUCCESS_THRESHOLD) return 'bare'

  if (state) {
    if (state === 'retained' || state === 'fluent') return 'bare'
    if (state === 'practiced') return 'completion'
    return 'worked' // seen
  }

  return authored ?? 'worked'
}
