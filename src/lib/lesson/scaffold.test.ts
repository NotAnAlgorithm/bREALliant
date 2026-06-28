import { describe, expect, it } from 'vitest'

import type { MasteryStateValue } from '../database.types'
import { selectScaffold, weakestState } from './scaffold'

describe('selectScaffold', () => {
  it('shows the full worked example to a novice (seen / no data)', () => {
    expect(selectScaffold({ state: 'seen' })).toBe('worked')
    expect(selectScaffold({})).toBe('worked')
  })

  it('fades to a completion scaffold once practiced', () => {
    expect(selectScaffold({ state: 'practiced' })).toBe('completion')
  })

  it('removes the scaffold once retained or fluent', () => {
    expect(selectScaffold({ state: 'retained' })).toBe('bare')
    expect(selectScaffold({ state: 'fluent' })).toBe('bare')
  })

  it('removes the scaffold when demonstrated success is high (>= 80%)', () => {
    expect(selectScaffold({ state: 'seen', successRate: 0.85 })).toBe('bare')
    expect(selectScaffold({ state: 'seen', successRate: 0.5 })).toBe('worked')
  })

  it('falls back to the authored level only when mastery is unknown', () => {
    expect(selectScaffold({ authored: 'completion' })).toBe('completion')
    // Mastery, when present, overrides the authored default.
    expect(selectScaffold({ state: 'retained', authored: 'worked' })).toBe('bare')
  })
})

describe('weakestState', () => {
  it('returns the least-mastered state among the tags', () => {
    const mastery = new Map<string, MasteryStateValue>([
      ['archimedean', 'fluent'],
      ['density', 'practiced'],
    ])
    expect(weakestState(['archimedean', 'density'], mastery)).toBe('practiced')
  })

  it('treats unknown tags as "seen"', () => {
    const mastery = new Map<string, MasteryStateValue>([['archimedean', 'fluent']])
    expect(weakestState(['archimedean', 'unknown'], mastery)).toBe('seen')
  })

  it('defaults to "seen" when there are no tags', () => {
    expect(weakestState([], new Map())).toBe('seen')
  })
})
