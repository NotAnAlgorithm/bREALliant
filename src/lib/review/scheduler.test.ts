import { describe, expect, it } from 'vitest'

import {
  REVIEW_LADDER_DAYS,
  addDays,
  isDue,
  ladderDays,
  nextReview,
} from './scheduler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

function daysBetween(fromIso: string, to: Date): number {
  return Math.round(
    (new Date(fromIso).getTime() - to.getTime()) / (24 * 60 * 60 * 1000),
  )
}

describe('nextReview', () => {
  it('starts an unscheduled concept at the first rung on correct recall', () => {
    const result = nextReview(null, true, NOW)
    expect(result.level).toBe(0)
    expect(result.intervalDays).toBe(REVIEW_LADDER_DAYS[0])
    expect(daysBetween(result.dueAt, NOW)).toBe(1)
  })

  it('advances up the ladder on consecutive correct recalls', () => {
    expect(nextReview(0, true, NOW).intervalDays).toBe(3)
    expect(nextReview(1, true, NOW).intervalDays).toBe(7)
    expect(nextReview(2, true, NOW).intervalDays).toBe(21)
  })

  it('caps at the last rung', () => {
    const last = REVIEW_LADDER_DAYS.length - 1
    const result = nextReview(last, true, NOW)
    expect(result.level).toBe(last)
    expect(result.intervalDays).toBe(REVIEW_LADDER_DAYS[last])
  })

  it('steps back a rung and halves the interval on a miss', () => {
    const result = nextReview(2, false, NOW)
    expect(result.level).toBe(1)
    // ladderDays(2) === 7, halved and rounded -> 4 (>= 1 day)
    expect(result.intervalDays).toBe(Math.max(1, Math.round(7 / 2)))
  })

  it('never schedules sooner than one day, even from the first rung', () => {
    const result = nextReview(0, false, NOW)
    expect(result.level).toBe(0)
    expect(result.intervalDays).toBeGreaterThanOrEqual(1)
  })
})

describe('isDue', () => {
  it('is false for unscheduled concepts', () => {
    expect(isDue(null, NOW)).toBe(false)
  })

  it('is true when the due time has passed', () => {
    expect(isDue(addDays(NOW, -1), NOW)).toBe(true)
    expect(isDue(NOW.toISOString(), NOW)).toBe(true)
  })

  it('is false when the due time is in the future', () => {
    expect(isDue(addDays(NOW, 1), NOW)).toBe(false)
  })
})

describe('ladderDays', () => {
  it('clamps out-of-range levels', () => {
    expect(ladderDays(-5)).toBe(REVIEW_LADDER_DAYS[0])
    expect(ladderDays(999)).toBe(REVIEW_LADDER_DAYS[REVIEW_LADDER_DAYS.length - 1])
  })
})
