import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import type { Database } from '../lib/database.types'
import { loadDueConcepts, recordReview } from './review'

const NOW = new Date('2026-01-01T00:00:00.000Z')

type Prev = {
  strength: number
  attempts: number
  correct: number
  review_level: number
} | null

function fakeClient({
  due = [] as unknown[],
  current = null as Prev,
}: {
  due?: unknown[]
  current?: Prev
}) {
  // Table-aware so concept_mastery writes are isolated from the streaks row
  // that recordReview now also touches (via recordReviewActivity).
  const upserts: Record<string, Record<string, unknown>[]> = {}
  const makeBuilder = (table: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      not: () => builder,
      lte: () => builder,
      order: () => Promise.resolve({ data: due, error: null }),
      maybeSingle: () =>
        Promise.resolve({
          data: table === 'concept_mastery' ? current : null,
          error: null,
        }),
      upsert: (row: Record<string, unknown>) => {
        ;(upserts[table] ??= []).push(row)
        return Promise.resolve({ error: null })
      },
    }
    return builder
  }
  const client = {
    from: (table: string) => makeBuilder(table),
  } as unknown as SupabaseClient<Database>
  return { client, masteryUpserts: () => upserts.concept_mastery ?? [] }
}

describe('loadDueConcepts', () => {
  it('maps rows and drops any with a null due_at', async () => {
    const { client } = fakeClient({
      due: [
        {
          tag: 'lub',
          state: 'retained',
          strength: 0.8,
          review_level: 1,
          due_at: '2025-12-31T00:00:00.000Z',
        },
        { tag: 'skip', state: 'seen', strength: 0, review_level: 0, due_at: null },
      ],
    })

    const result = await loadDueConcepts(client, 'user-1', NOW)

    expect(result).toEqual([
      {
        tag: 'lub',
        state: 'retained',
        strength: 0.8,
        reviewLevel: 1,
        dueAt: '2025-12-31T00:00:00.000Z',
      },
    ])
  })
})

describe('recordReview', () => {
  it('advances the ladder and strengthens mastery on correct recall', async () => {
    const { client, masteryUpserts } = fakeClient({
      current: { strength: 0.8, attempts: 1, correct: 1, review_level: 0 },
    })

    const result = await recordReview(client, 'user-1', 'lub', true, NOW)

    expect(result.correct).toBe(true)
    expect(masteryUpserts()).toHaveLength(1)
    const row = masteryUpserts()[0]
    expect(row.review_level).toBe(1)
    expect(row.attempts).toBe(2)
    expect(row.correct).toBe(2)
    expect(new Date(row.due_at as string).getTime()).toBe(
      NOW.getTime() + 3 * 24 * 60 * 60 * 1000,
    )
  })

  it('steps the ladder back and weakens mastery on a miss', async () => {
    const { client, masteryUpserts } = fakeClient({
      current: { strength: 0.9, attempts: 4, correct: 4, review_level: 2 },
    })

    const result = await recordReview(client, 'user-1', 'lub', false, NOW)

    expect(result.correct).toBe(false)
    const row = masteryUpserts()[0]
    expect(row.review_level).toBe(1)
    expect(row.strength as number).toBeLessThan(0.9)
  })

  it('schedules a first review when the concept had no prior row', async () => {
    const { client, masteryUpserts } = fakeClient({ current: null })

    await recordReview(client, 'user-1', 'lub', true, NOW)

    const row = masteryUpserts()[0]
    expect(row.review_level).toBe(0)
    expect(row.attempts).toBe(1)
    expect(new Date(row.due_at as string).getTime()).toBe(
      NOW.getTime() + 1 * 24 * 60 * 60 * 1000,
    )
  })
})
