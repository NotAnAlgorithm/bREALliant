// F2.1 — Spaced-retrieval scheduler (pure, no DB).
//
// Concepts move along an expanding interval ladder on correct recall and step
// back (with a halved interval) on a miss — the spacing/desirable-difficulty
// pattern (Roediger & Karpicke; Bjork). All functions are pure and clock-
// injectable for testing.

export const REVIEW_LADDER_DAYS = [1, 3, 7, 21] as const

const LAST_LEVEL = REVIEW_LADDER_DAYS.length - 1
const DAY_MS = 24 * 60 * 60 * 1000

export type ReviewOutcome = {
  /** Index into REVIEW_LADDER_DAYS after this review. */
  level: number
  /** Days until the next review. */
  intervalDays: number
  /** ISO timestamp of the next scheduled review. */
  dueAt: string
}

export function addDays(now: Date, days: number): string {
  return new Date(now.getTime() + days * DAY_MS).toISOString()
}

export function ladderDays(level: number): number {
  const clamped = Math.max(0, Math.min(LAST_LEVEL, level))
  return REVIEW_LADDER_DAYS[clamped]
}

/**
 * Computes the next review from the previous ladder level and this review's
 * outcome. `prevLevel === null` means the concept has never been scheduled, so
 * a first correct recall starts at level 0 (1 day).
 */
export function nextReview(
  prevLevel: number | null,
  correct: boolean,
  now: Date = new Date(),
): ReviewOutcome {
  const base = prevLevel == null ? -1 : prevLevel

  if (correct) {
    const level = Math.min(base + 1, LAST_LEVEL)
    const intervalDays = ladderDays(level)
    return { level, intervalDays, dueAt: addDays(now, intervalDays) }
  }

  // Miss: step back a rung and bring the next review sooner (halve the interval
  // the concept had reached), but never below a day.
  const level = Math.max(0, base - 1)
  const intervalDays = Math.max(1, Math.round(ladderDays(Math.max(0, base)) / 2))
  return { level, intervalDays, dueAt: addDays(now, intervalDays) }
}

/** Whether a scheduled review is due. Unscheduled concepts (null) are not due. */
export function isDue(dueAt: string | null, now: Date = new Date()): boolean {
  if (!dueAt) return false
  return new Date(dueAt).getTime() <= now.getTime()
}
