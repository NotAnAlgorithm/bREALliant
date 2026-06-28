import { describe, expect, it } from 'vitest'

import {
  applyAttempt,
  applyImplicitCredit,
  deriveState,
  isRetained,
  prerequisiteTags,
} from './mastery'

describe('deriveState', () => {
  it('stays "seen" until the first direct attempt', () => {
    expect(deriveState(0.9, 0)).toBe('seen')
  })

  it('maps strength thresholds once attempted', () => {
    expect(deriveState(0.2, 1)).toBe('seen')
    expect(deriveState(0.6, 1)).toBe('practiced')
    expect(deriveState(0.85, 1)).toBe('retained')
    expect(deriveState(0.97, 1)).toBe('fluent')
  })
})

describe('applyAttempt', () => {
  it('a first correct attempt reaches retained', () => {
    const m = applyAttempt('supremum', null, true)
    expect(m.attempts).toBe(1)
    expect(m.correct).toBe(1)
    expect(m.strength).toBeCloseTo(0.8)
    expect(m.state).toBe('retained')
  })

  it('a second correct attempt reaches fluent', () => {
    const m = applyAttempt(
      'supremum',
      { strength: 0.8, attempts: 1, correct: 1 },
      true,
    )
    expect(m.strength).toBeCloseTo(0.96)
    expect(m.state).toBe('fluent')
  })

  it('a miss halves strength and can demote, without losing the correct count', () => {
    const m = applyAttempt(
      'supremum',
      { strength: 0.8, attempts: 1, correct: 1 },
      false,
    )
    expect(m.strength).toBeCloseTo(0.4)
    expect(m.attempts).toBe(2)
    expect(m.correct).toBe(1)
    expect(m.state).toBe('seen')
  })
})

describe('applyImplicitCredit (FIRe)', () => {
  it('raises strength of an already-practiced prerequisite', () => {
    const m = applyImplicitCredit('bounds', {
      strength: 0.8,
      attempts: 1,
      correct: 1,
    })
    expect(m.strength).toBeGreaterThan(0.8)
    expect(m.attempts).toBe(1) // never fabricates attempts
  })

  it('cannot advance a never-attempted concept past "seen"', () => {
    const m = applyImplicitCredit('bounds', null)
    expect(m.attempts).toBe(0)
    expect(m.strength).toBeGreaterThan(0)
    expect(m.state).toBe('seen')
  })
})

describe('prerequisiteTags', () => {
  const lessons = [
    { lessonId: 'a', tags: ['t-a1', 't-a2'], prerequisites: [] },
    { lessonId: 'b', tags: ['t-b1', 't-a1'], prerequisites: ['a'] },
  ]
  const byId = new Map(lessons.map((l) => [l.lessonId, l]))

  it('collects prerequisite lesson tags, excluding the lesson’s own tags', () => {
    const tags = prerequisiteTags(lessons[1], byId, new Set(lessons[1].tags))
    expect(tags).toEqual(['t-a2']) // t-a1 excluded (shared with b)
  })
})

describe('isRetained', () => {
  it('is true only for retained/fluent', () => {
    expect(isRetained('retained')).toBe(true)
    expect(isRetained('fluent')).toBe(true)
    expect(isRetained('practiced')).toBe(false)
    expect(isRetained('seen')).toBe(false)
    expect(isRetained(undefined)).toBe(false)
  })
})
