// F3.2 — Interleaved practice-session builder (pure).
//
// Assembles a single practice session that mixes problems across the concepts a
// learner already knows. Two ideas from the spaced/interleaved-practice spec:
//
//   1. Eligibility: only concepts the learner has actually *practiced* (state
//      >= 'practiced') are worth re-drilling. A merely 'seen' concept has no
//      direct attempt yet, so it is excluded.
//   2. No starvation + interleaving: items are drawn round-robin across the
//      eligible tags, so every eligible concept contributes one item before any
//      concept contributes a second. When a `kindOf` classifier is supplied we
//      additionally do a best-effort reorder so two consecutive entries are not
//      the same kind (surface variety / desirable difficulty).
//
// The module is fully deterministic: given the same input it returns the same
// session. No randomness is involved.

import type { MasteryState } from '../../services/mastery'

export type ConceptPool<T> = {
  tag: string
  state: MasteryState
  items: T[]
}

export type SessionEntry<T> = {
  tag: string
  item: T
}

export type BuildSessionOptions<T> = {
  /** Maximum number of entries to include. Omit/undefined for no cap. */
  limit?: number
  /**
   * Classifies an item into a "kind" used to interleave the session so two
   * adjacent entries avoid sharing a kind when a different kind is available.
   * When omitted, ordering is plain round-robin by tag (which already
   * interleaves tags).
   */
  kindOf?: (item: T) => string
  /**
   * Stable identity for an item, used to DEDUPLICATE across pools. A problem
   * that carries several concept tags is indexed under each of them in the
   * retrieval bank, so without this it would surface once per shared tag in a
   * single session. When supplied, only the first occurrence of each key is
   * kept (so it still counts toward exactly one concept).
   */
  keyOf?: (item: T) => string
}

/** Ordering of mastery states. Higher rank = more mastered. */
const STATE_RANK: Record<MasteryState, number> = {
  seen: 0,
  practiced: 1,
  retained: 2,
  fluent: 3,
}

/** Minimum state a concept must reach to be eligible for interleaved practice. */
const MIN_ELIGIBLE_RANK = STATE_RANK.practiced

/** Numeric rank of a mastery state (shared ordering helper). */
export function stateRank(state: MasteryState): number {
  return STATE_RANK[state] ?? 0
}

/** Whether a concept in this state is eligible (>= 'practiced'). */
export function isEligibleState(state: MasteryState): boolean {
  return stateRank(state) >= MIN_ELIGIBLE_RANK
}

/**
 * Round-robin draw across pools: take items[0] from every pool in order, then
 * items[1] from every pool, and so on. Guarantees each pool contributes one
 * item before any pool contributes a second, so no single tag is starved.
 */
function roundRobin<T>(pools: ConceptPool<T>[]): SessionEntry<T>[] {
  const out: SessionEntry<T>[] = []
  const maxLen = pools.reduce((max, pool) => Math.max(max, pool.items.length), 0)
  for (let index = 0; index < maxLen; index += 1) {
    for (const pool of pools) {
      if (index < pool.items.length) {
        out.push({ tag: pool.tag, item: pool.items[index] })
      }
    }
  }
  return out
}

/**
 * Best-effort reorder so no two consecutive entries share a kind when a
 * different kind is still available. Deterministic greedy: at each step it
 * considers the kinds whose kind differs from the previously placed one and
 * picks the kind with the most items still remaining (earliest original
 * position breaks ties). Always emptying the most-frequent eligible kind first
 * yields a perfect alternation whenever one exists, and degrades gracefully
 * (forced repeats only when one kind dominates). With a single kind left it
 * simply keeps original order, so round-robin fairness is preserved otherwise.
 */
function avoidAdjacentKinds<T>(
  entries: SessionEntry<T>[],
  kindOf: (item: T) => string,
): SessionEntry<T>[] {
  const remaining = [...entries]
  const out: SessionEntry<T>[] = []
  let prevKind: string | undefined

  while (remaining.length > 0) {
    const counts = new Map<string, number>()
    for (const entry of remaining) {
      const kind = kindOf(entry.item)
      counts.set(kind, (counts.get(kind) ?? 0) + 1)
    }

    let pickIndex = -1
    let bestCount = -1
    for (let i = 0; i < remaining.length; i += 1) {
      const kind = kindOf(remaining[i].item)
      if (kind === prevKind) continue
      const count = counts.get(kind) ?? 0
      if (count > bestCount) {
        bestCount = count
        pickIndex = i
      }
    }
    // Only the previous kind remains: forced repeat, keep earliest.
    if (pickIndex === -1) pickIndex = 0

    const [picked] = remaining.splice(pickIndex, 1)
    out.push(picked)
    prevKind = kindOf(picked.item)
  }

  return out
}

/**
 * Builds an interleaved practice session from concept pools.
 *
 * @param pools One pool per concept tag, each with the learner's current
 *   mastery state and the candidate items for that concept.
 * @param options Optional `limit` and `kindOf` classifier (see type docs).
 * @returns Ordered session entries. Empty when nothing is eligible.
 */
export function buildInterleavedSession<T>(
  pools: ConceptPool<T>[],
  options: BuildSessionOptions<T> = {},
): SessionEntry<T>[] {
  const { limit, kindOf, keyOf } = options

  const eligible = pools.filter(
    (pool) => isEligibleState(pool.state) && pool.items.length > 0,
  )

  let entries = roundRobin(eligible)

  // Drop repeats of the same underlying item (multi-tag problems appear in more
  // than one pool) before capping, so the limit counts distinct items.
  if (keyOf) {
    const seen = new Set<string>()
    entries = entries.filter((entry) => {
      const key = keyOf(entry.item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  if (typeof limit === 'number' && limit >= 0) {
    entries = entries.slice(0, limit)
  }

  if (kindOf) {
    entries = avoidAdjacentKinds(entries, kindOf)
  }

  return entries
}
