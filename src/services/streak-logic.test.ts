import { describe, expect, it } from 'vitest'

import {
  computeNextStreak,
  previousUtcDateString,
  toUtcDateString,
} from './streak-logic'

describe('date helpers', () => {
  it('formats a date as a UTC YYYY-MM-DD string', () => {
    expect(toUtcDateString(new Date('2026-06-22T23:59:59.000Z'))).toBe(
      '2026-06-22',
    )
  })

  it('steps back across a month boundary', () => {
    expect(previousUtcDateString('2026-07-01')).toBe('2026-06-30')
  })
})

describe('computeNextStreak', () => {
  it('starts streak on first activity', () => {
    expect(computeNextStreak(0, null, '2026-06-22')).toEqual({
      current_streak: 1,
      last_activity_date: '2026-06-22',
    })
  })

  it('increments when last activity was yesterday', () => {
    const today = '2026-06-22'
    const yesterday = previousUtcDateString(today)
    expect(computeNextStreak(3, yesterday, today)).toEqual({
      current_streak: 4,
      last_activity_date: today,
    })
  })

  it('does not change on same day', () => {
    expect(computeNextStreak(5, '2026-06-22', '2026-06-22')).toEqual({
      current_streak: 5,
      last_activity_date: '2026-06-22',
    })
  })

  it('resets after a gap', () => {
    expect(computeNextStreak(5, '2026-06-20', '2026-06-22')).toEqual({
      current_streak: 1,
      last_activity_date: '2026-06-22',
    })
  })
})
