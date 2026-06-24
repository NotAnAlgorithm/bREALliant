import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import type { Database } from '../lib/database.types'
import { loadCourseProgress } from './progress'

type Rows = Record<string, unknown[]>

/**
 * Minimal fake of the supabase query builder for the subset of calls
 * loadCourseProgress makes: from(table).select(cols).eq(col, val) -> Promise.
 */
function fakeClient(rows: Rows): SupabaseClient<Database> {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => Promise.resolve({ data: rows[table] ?? [], error: null }),
      }),
    }),
  } as unknown as SupabaseClient<Database>
}

describe('loadCourseProgress', () => {
  it('returns completed ids and in-progress ids excluding completed ones', async () => {
    const client = fakeClient({
      lesson_completions: [{ lesson_id: 'lesson-a' }],
      lesson_progress: [
        { lesson_id: 'lesson-a', completed: true },
        { lesson_id: 'lesson-b', completed: false },
      ],
    })

    const result = await loadCourseProgress(client, 'user-1')

    expect(result.completedIds).toEqual(['lesson-a'])
    expect(result.inProgressIds).toEqual(['lesson-b'])
  })

  it('handles empty progress', async () => {
    const client = fakeClient({})
    const result = await loadCourseProgress(client, 'user-1')

    expect(result.completedIds).toEqual([])
    expect(result.inProgressIds).toEqual([])
  })

  it('does not double-count a completed lesson as in progress', async () => {
    const client = fakeClient({
      lesson_completions: [{ lesson_id: 'lesson-a' }],
      lesson_progress: [{ lesson_id: 'lesson-a', completed: false }],
    })

    const result = await loadCourseProgress(client, 'user-1')

    expect(result.completedIds).toEqual(['lesson-a'])
    expect(result.inProgressIds).toEqual([])
  })
})
