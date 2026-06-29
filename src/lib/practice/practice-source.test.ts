import { describe, expect, it } from 'vitest'

import type { MasteryStateValue } from '../database.types'
import type { GradedItem, RetrievalBank } from '../review/retrieval-bank'
import { buildInterleavedSession } from './session-builder'
import { buildPracticePools } from './practice-source'

function item(id: string, difficulty?: number): GradedItem {
  return {
    id,
    prompt: id,
    widget: { kind: 'multiple_choice', props: { choices: [] } },
    validator: { type: 'set_match', engine: 'mathjs', accept: ['a'] },
    feedback: { correct: 'y', incorrect: [{ match: '*', message: 'n' }] },
    ...(difficulty != null ? { difficulty } : {}),
  } as GradedItem
}

function bankOf(entries: Record<string, GradedItem[]>): RetrievalBank {
  return new Map(Object.entries(entries))
}

describe('buildPracticePools', () => {
  it('skips tags with no items and defaults unknown tags to "seen"', () => {
    const pools = buildPracticePools(
      new Map<string, MasteryStateValue>([['lub', 'retained']]),
      bankOf({ lub: [item('a')], supremum: [item('b')], empty: [] }),
    )

    expect(pools.map((p) => p.tag)).toEqual(['lub', 'supremum'])
    expect(pools.find((p) => p.tag === 'lub')?.state).toBe('retained')
    expect(pools.find((p) => p.tag === 'supremum')?.state).toBe('seen')
  })

  it('feeds the session builder so only practiced+ concepts appear', () => {
    const pools = buildPracticePools(
      new Map<string, MasteryStateValue>([
        ['lub', 'retained'],
        ['supremum', 'seen'],
      ]),
      bankOf({ lub: [item('a')], supremum: [item('b')] }),
    )

    const session = buildInterleavedSession(pools)
    const tags = new Set(session.map((entry) => entry.tag))

    expect(tags.has('lub')).toBe(true)
    expect(tags.has('supremum')).toBe(false) // 'seen' is excluded
  })

  it('orders each pool by the difficulty ramp for its mastery state', () => {
    // A 'practiced' concept should lead with standard (d1) items; a 'fluent'
    // one should lead with challenge (d3) items.
    const items = [item('hard', 3), item('std', 1), item('mid', 2)]
    const practiced = buildPracticePools(
      new Map<string, MasteryStateValue>([['lub', 'practiced']]),
      bankOf({ lub: items }),
    )
    expect(practiced[0].items[0].id).toBe('std')

    const fluent = buildPracticePools(
      new Map<string, MasteryStateValue>([['lub', 'fluent']]),
      bankOf({ lub: items }),
    )
    expect(fluent[0].items[0].id).toBe('hard')
  })
})
