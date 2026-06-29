import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_WEIGHTS,
  itemDifficulty,
  orderByDifficulty,
  type Difficulty,
} from './difficulty'

type Item = { id: string; difficulty?: number | null }

const mk = (id: string, difficulty?: number): Item => ({ id, difficulty })

/** Build n items of a given difficulty: d2-0, d2-1, … */
function many(difficulty: Difficulty, n: number): Item[] {
  return Array.from({ length: n }, (_, i) => mk(`d${difficulty}-${i}`, difficulty))
}

const diffOf = (it: Item): Difficulty => itemDifficulty(it)
const seq = (items: Item[]) => items.map(diffOf)

describe('itemDifficulty', () => {
  it('defaults to 2 (standard) when absent or out of range', () => {
    expect(itemDifficulty({})).toBe(DEFAULT_DIFFICULTY)
    expect(itemDifficulty({ difficulty: null })).toBe(2)
    expect(itemDifficulty({ difficulty: 0 })).toBe(2)
    expect(itemDifficulty({ difficulty: 4 })).toBe(2)
  })

  it('passes through 1–3', () => {
    expect(itemDifficulty({ difficulty: 1 })).toBe(1)
    expect(itemDifficulty({ difficulty: 3 })).toBe(3)
  })
})

describe('orderByDifficulty', () => {
  it('practiced front-loads d1 in a 3:1 ratio with d2 (no d3)', () => {
    const items = [...many(1, 6), ...many(2, 2), ...many(3, 2)]
    const ordered = orderByDifficulty(items, 'practiced', diffOf)
    // First cycle: 3×d1, 1×d2; second cycle: 3×d1, 1×d2; then leftover d3s last.
    expect(seq(ordered)).toEqual([1, 1, 1, 2, 1, 1, 1, 2, 3, 3])
  })

  it('retained leads with d2 in a 1:3:1 mix', () => {
    const items = [...many(1, 2), ...many(2, 6), ...many(3, 2)]
    const ordered = orderByDifficulty(items, 'retained', diffOf)
    // Per cycle: 3×d2 (dominant), then 1×d1, 1×d3.
    expect(seq(ordered)).toEqual([2, 2, 2, 1, 3, 2, 2, 2, 1, 3])
  })

  it('fluent leads with d3, mostly challenge with occasional easier', () => {
    const items = [...many(1, 1), ...many(2, 2), ...many(3, 6)]
    const ordered = orderByDifficulty(items, 'fluent', diffOf)
    // Per cycle: 6×d3 (dominant), then 2×d2, 1×d1.
    expect(seq(ordered)).toEqual([3, 3, 3, 3, 3, 3, 2, 2, 1])
  })

  it('never drops dispreferred items — appends them last in ascending order', () => {
    // A 'practiced' learner whose only items are challenge (weight 0) ones.
    const items = many(3, 3)
    const ordered = orderByDifficulty(items, 'practiced', diffOf)
    expect(ordered.map((i) => i.id)).toEqual(['d3-0', 'd3-1', 'd3-2'])
  })

  it('preserves original order within a difficulty bucket', () => {
    const items = [mk('a', 1), mk('b', 1), mk('c', 1)]
    expect(orderByDifficulty(items, 'practiced', diffOf).map((i) => i.id)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('is a no-op for 0 or 1 items', () => {
    expect(orderByDifficulty([], 'retained', diffOf)).toEqual([])
    const one = [mk('a', 3)]
    expect(orderByDifficulty(one, 'practiced', diffOf)).toEqual(one)
  })

  it('is deterministic', () => {
    const items = [...many(1, 3), ...many(2, 3), ...many(3, 3)]
    const a = orderByDifficulty(items, 'retained', diffOf).map((i) => i.id)
    const b = orderByDifficulty(items, 'retained', diffOf).map((i) => i.id)
    expect(a).toEqual(b)
  })

  it('keeps a full permutation (no loss, no duplication)', () => {
    const items = [...many(1, 4), ...many(2, 5), ...many(3, 6)]
    for (const state of Object.keys(DIFFICULTY_WEIGHTS) as Array<
      keyof typeof DIFFICULTY_WEIGHTS
    >) {
      const ordered = orderByDifficulty(items, state, diffOf)
      expect(ordered).toHaveLength(items.length)
      expect(new Set(ordered.map((i) => i.id)).size).toBe(items.length)
    }
  })
})
