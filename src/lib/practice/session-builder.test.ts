import { describe, expect, it } from 'vitest'

import type { MasteryState } from '../../services/mastery'

import {
  buildInterleavedSession,
  isEligibleState,
  stateRank,
  type ConceptPool,
} from './session-builder'

type Item = { id: string; kind: string }

function pool(
  tag: string,
  state: MasteryState,
  ids: string[],
  kind = tag,
): ConceptPool<Item> {
  return { tag, state, items: ids.map((id) => ({ id, kind })) }
}

describe('state ordering helpers', () => {
  it('ranks states seen < practiced < retained < fluent', () => {
    expect(stateRank('seen')).toBeLessThan(stateRank('practiced'))
    expect(stateRank('practiced')).toBeLessThan(stateRank('retained'))
    expect(stateRank('retained')).toBeLessThan(stateRank('fluent'))
  })

  it('treats practiced and above as eligible, seen as not', () => {
    expect(isEligibleState('seen')).toBe(false)
    expect(isEligibleState('practiced')).toBe(true)
    expect(isEligibleState('retained')).toBe(true)
    expect(isEligibleState('fluent')).toBe(true)
  })
})

describe('buildInterleavedSession — eligibility', () => {
  it('includes only practiced+ tags and excludes seen pools', () => {
    const session = buildInterleavedSession([
      pool('seen-tag', 'seen', ['s1', 's2']),
      pool('A', 'practiced', ['a1']),
      pool('B', 'fluent', ['b1']),
    ])
    const tags = session.map((entry) => entry.tag)
    expect(tags).not.toContain('seen-tag')
    expect(new Set(tags)).toEqual(new Set(['A', 'B']))
  })

  it('returns [] for empty pools and seen-only pools', () => {
    expect(buildInterleavedSession([])).toEqual([])
    expect(
      buildInterleavedSession([
        pool('A', 'seen', ['a1', 'a2']),
        pool('B', 'practiced', []),
      ]),
    ).toEqual([])
  })
})

describe('buildInterleavedSession — no starvation', () => {
  it('covers every eligible tag once before any tag repeats', () => {
    const session = buildInterleavedSession([
      pool('A', 'practiced', ['a1', 'a2', 'a3']),
      pool('B', 'retained', ['b1', 'b2', 'b3']),
      pool('C', 'fluent', ['c1', 'c2', 'c3']),
    ])
    const firstThree = session.slice(0, 3).map((entry) => entry.tag)
    expect(new Set(firstThree)).toEqual(new Set(['A', 'B', 'C']))
    expect(session).toHaveLength(9)
  })

  it('still drains tags with uneven item counts', () => {
    const session = buildInterleavedSession([
      pool('A', 'practiced', ['a1']),
      pool('B', 'practiced', ['b1', 'b2', 'b3']),
    ])
    expect(session.map((e) => e.item.id)).toEqual(['a1', 'b1', 'b2', 'b3'])
  })
})

describe('buildInterleavedSession — interleaving by kind', () => {
  it('avoids consecutive same-kind entries when avoidable', () => {
    // B and C share kind 'y'; A is kind 'x'. Plain round-robin (A,B,C,A,B,A)
    // would place the two 'y' entries (B,C) adjacent. With three 'x' and three
    // 'y' items a perfect alternation exists, so the reorder should produce no
    // two consecutive entries of the same kind.
    const session = buildInterleavedSession(
      [
        pool('A', 'practiced', ['a1', 'a2', 'a3'], 'x'),
        pool('B', 'practiced', ['b1', 'b2'], 'y'),
        pool('C', 'practiced', ['c1'], 'y'),
      ],
      { kindOf: (item) => item.kind },
    )
    expect(session).toHaveLength(6)
    for (let i = 1; i < session.length; i += 1) {
      expect(session[i].item.kind).not.toBe(session[i - 1].item.kind)
    }
  })

  it('does not crash when only one kind exists (forced repeats)', () => {
    const session = buildInterleavedSession(
      [
        pool('A', 'practiced', ['a1', 'a2'], 'x'),
        pool('B', 'practiced', ['b1'], 'x'),
      ],
      { kindOf: (item) => item.kind },
    )
    expect(session).toHaveLength(3)
    expect(session.every((entry) => entry.item.kind === 'x')).toBe(true)
  })
})

describe('buildInterleavedSession — limit & determinism', () => {
  it('respects the limit', () => {
    const session = buildInterleavedSession(
      [
        pool('A', 'practiced', ['a1', 'a2', 'a3']),
        pool('B', 'practiced', ['b1', 'b2', 'b3']),
      ],
      { limit: 3 },
    )
    expect(session).toHaveLength(3)
  })

  it('includes all eligible items when no limit is given', () => {
    const session = buildInterleavedSession([
      pool('A', 'practiced', ['a1', 'a2']),
      pool('B', 'retained', ['b1', 'b2', 'b3']),
    ])
    expect(session).toHaveLength(5)
  })

  it('is deterministic across repeated calls', () => {
    const pools: ConceptPool<Item>[] = [
      pool('A', 'practiced', ['a1', 'a2'], 'x'),
      pool('B', 'retained', ['b1', 'b2'], 'y'),
    ]
    const opts = { kindOf: (item: Item) => item.kind }
    const first = buildInterleavedSession(pools, opts)
    const second = buildInterleavedSession(pools, opts)
    expect(first).toEqual(second)
  })
})
