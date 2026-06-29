// Difficulty-aware, mastery-driven ordering of practice/review items.
//
// Each item carries an optional `difficulty` on a 1–3 scale (1 = standard …
// 3 = challenge); absent is treated as 2. As a concept's mastery grows we want
// to ramp the difficulty mix served to the learner — easy-heavy early, then
// shifting toward challenge — without ever dropping any item from the pool.
//
// The ordering is fully DETERMINISTIC (no randomness): given the same items and
// state it always returns the same sequence, matching the rest of the
// review/practice pipeline.

import type { MasteryState } from '../../services/mastery'

export type Difficulty = 1 | 2 | 3

export const DEFAULT_DIFFICULTY: Difficulty = 2

/**
 * Per-state target mix across difficulties [d1, d2, d3], expressed as a
 * per-cycle quota (also readable as a ratio). Tuned with the author:
 *  - practiced → mostly standard (3:1:0)
 *  - retained  → centered, with a taste of both ends (1:3:1)
 *  - fluent    → mostly challenge, occasional easier for spacing (1:2:6)
 * `seen` is not eligible for practice and is not scheduled for review, but is
 * defined (= practiced) for safety.
 */
export const DIFFICULTY_WEIGHTS: Record<MasteryState, [number, number, number]> = {
  seen: [3, 1, 0],
  practiced: [3, 1, 0],
  retained: [1, 3, 1],
  fluent: [1, 2, 6],
}

const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3]

/** Normalize an item's difficulty to the 1–3 scale (default 2). */
export function itemDifficulty(item: { difficulty?: number | null }): Difficulty {
  const d = item.difficulty
  return d === 1 || d === 2 || d === 3 ? d : DEFAULT_DIFFICULTY
}

/**
 * Order items so the prefix realizes the state's target difficulty mix.
 *
 * Algorithm — per-cycle quota interleave: bucket items by difficulty (preserving
 * original order within a bucket), then loop, each pass emitting up to
 * `weight[d]` items from each difficulty. Difficulties are visited by DESCENDING
 * weight (ties → easier first), so each state leads with its dominant difficulty
 * (d1 for `practiced`, d2 for `retained`, d3 for `fluent`). This repeats until
 * every weighted bucket is exhausted. Items in difficulties with weight 0 (e.g.
 * a challenge problem for a freshly-`practiced` learner) are appended at the end
 * so nothing is ever lost — preferred difficulties simply come first.
 */
export function orderByDifficulty<T>(
  items: readonly T[],
  state: MasteryState,
  difficultyOf: (item: T) => Difficulty,
): T[] {
  if (items.length <= 1) return [...items]

  const weights = DIFFICULTY_WEIGHTS[state] ?? DIFFICULTY_WEIGHTS.practiced
  const buckets: Record<Difficulty, T[]> = { 1: [], 2: [], 3: [] }
  for (const item of items) buckets[difficultyOf(item)].push(item)

  // Visit dominant (highest-weight) difficulty first; break ties easier-first.
  const visitOrder = [...DIFFICULTIES].sort((a, b) =>
    weights[b - 1] !== weights[a - 1] ? weights[b - 1] - weights[a - 1] : a - b,
  )

  const ordered: T[] = []
  let emittedThisPass = true
  while (emittedThisPass) {
    emittedThisPass = false
    for (const d of visitOrder) {
      const quota = weights[d - 1]
      const bucket = buckets[d]
      for (let k = 0; k < quota && bucket.length > 0; k += 1) {
        ordered.push(bucket.shift() as T)
        emittedThisPass = true
      }
    }
  }

  // Dispreferred (weight-0) leftovers, ascending difficulty, so no item is lost.
  for (const d of DIFFICULTIES) {
    if (buckets[d].length > 0) ordered.push(...buckets[d])
  }

  return ordered
}
