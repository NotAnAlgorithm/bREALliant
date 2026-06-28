import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import type { Database, LessonProgressSnapshot } from '../lib/database.types'
import { completeLesson, saveLessonProgress } from './progress'
import { recordReview } from './review'

/**
 * Fake supabase client tracking upserts/updates per table. Supports the chains
 * used by recordReview, saveLessonProgress, completeLesson, and the streak
 * bookkeeping in recordReviewActivity:
 *   - from(t).select(...).eq(...).eq(...).maybeSingle()
 *   - from(t).upsert(payload, opts)
 *   - from(t).update(payload).eq(...).eq(...)
 */
function makeClient(
  singleByTable: Record<string, { data: unknown; error: unknown }> = {},
) {
  const upserts: Record<string, unknown[]> = {}
  const updates: Record<string, unknown[]> = {}

  function chain(table: string) {
    const single = singleByTable[table] ?? { data: null, error: null }
    const obj: Record<string, unknown> = {
      eq: () => obj,
      maybeSingle: () => Promise.resolve(single),
      // Thenable so `await update(...).eq(...).eq(...)` resolves.
      then: (resolve: (v: { error: null }) => unknown) =>
        resolve({ error: null }),
    }
    return obj
  }

  const client = {
    from(table: string) {
      return {
        select: () => chain(table),
        upsert: (payload: unknown) => {
          ;(upserts[table] ??= []).push(payload)
          return Promise.resolve({ error: null })
        },
        update: (payload: unknown) => {
          ;(updates[table] ??= []).push(payload)
          return chain(table)
        },
      }
    },
  } as unknown as SupabaseClient<Database>

  return { client, upserts, updates }
}

const NOW = new Date('2026-06-22T12:00:00.000Z')

const snapshot: LessonProgressSnapshot = {
  stepIndex: 0,
  stepId: 'step-1',
  stepState: {},
  stepStates: {},
  stepAttempts: {},
  completed: false,
}

describe('recordReview streak binding', () => {
  it('advances the streak when a due review is cleared (correct)', async () => {
    const { client, upserts } = makeClient({
      concept_mastery: { data: null, error: null },
      streaks: { data: null, error: null },
    })

    await recordReview(client, 'user-1', 'bounds', true, NOW)

    expect(upserts.streaks).toHaveLength(1)
    expect(upserts.streaks[0]).toMatchObject({
      user_id: 'user-1',
      current_streak: 1,
      last_activity_date: '2026-06-22',
    })
  })

  it('counts an incorrect attempt as streak activity too', async () => {
    const { client, upserts } = makeClient({
      concept_mastery: { data: null, error: null },
      streaks: { data: null, error: null },
    })

    await recordReview(client, 'user-1', 'bounds', false, NOW)

    expect(upserts.streaks).toHaveLength(1)
    expect(upserts.streaks[0]).toMatchObject({
      current_streak: 1,
      last_activity_date: '2026-06-22',
    })
  })

  it('increments an existing streak from yesterday', async () => {
    const { client, upserts } = makeClient({
      concept_mastery: { data: null, error: null },
      streaks: {
        data: { current_streak: 4, last_activity_date: '2026-06-21' },
        error: null,
      },
    })

    await recordReview(client, 'user-1', 'bounds', true, NOW)

    expect(upserts.streaks[0]).toMatchObject({
      current_streak: 5,
      last_activity_date: '2026-06-22',
    })
  })
})

describe('lesson saves/completions no longer touch the streak', () => {
  it('saveLessonProgress does not upsert a streak', async () => {
    const { client, upserts } = makeClient()

    await saveLessonProgress(client, 'user-1', 'lesson-a', snapshot)

    expect(upserts.lesson_progress).toHaveLength(1)
    expect(upserts.streaks).toBeUndefined()
  })

  it('completeLesson does not upsert a streak', async () => {
    const { client, upserts } = makeClient()

    await completeLesson(client, 'user-1', 'lesson-a', ['bounds'])

    expect(upserts.lesson_completions).toHaveLength(1)
    expect(upserts.streaks).toBeUndefined()
  })
})
