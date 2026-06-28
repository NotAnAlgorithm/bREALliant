import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  ConceptMasteryRow,
  Database,
  MasteryStateValue,
} from '../lib/database.types'
import { nextReview } from '../lib/review/scheduler'
import { applyAttempt } from './mastery'
import { recordReviewActivity } from './progress'

type Client = SupabaseClient<Database>

export type DueConcept = {
  tag: string
  state: MasteryStateValue
  strength: number
  reviewLevel: number
  dueAt: string
}

/** Concepts whose next spaced review is due (due_at <= now), soonest first. */
export async function loadDueConcepts(
  client: Client,
  userId: string,
  now: Date = new Date(),
): Promise<DueConcept[]> {
  const { data, error } = await client
    .from('concept_mastery')
    .select('tag, state, strength, review_level, due_at')
    .eq('user_id', userId)
    .not('due_at', 'is', null)
    .lte('due_at', now.toISOString())
    .order('due_at', { ascending: true })

  if (error) throw error
  return (data ?? [])
    .filter((row) => row.due_at != null)
    .map((row) => ({
      tag: row.tag,
      state: row.state,
      strength: row.strength,
      reviewLevel: row.review_level,
      dueAt: row.due_at as string,
    }))
}

export type ReviewResult = {
  tag: string
  correct: boolean
  state: MasteryStateValue
  dueAt: string
}

/**
 * Records a single spaced-review attempt: updates the concept's mastery
 * (correct strengthens, miss weakens) and reschedules the next review along the
 * ladder. Correct recall of a retained concept can promote it toward fluent.
 */
export async function recordReview(
  client: Client,
  userId: string,
  tag: string,
  correct: boolean,
  now: Date = new Date(),
): Promise<ReviewResult> {
  const { data: prev, error: loadError } = await client
    .from('concept_mastery')
    .select('strength, attempts, correct, review_level')
    .eq('user_id', userId)
    .eq('tag', tag)
    .maybeSingle()

  if (loadError) throw loadError

  const mastery = applyAttempt(
    tag,
    prev
      ? { strength: prev.strength, attempts: prev.attempts, correct: prev.correct }
      : null,
    correct,
  )
  const schedule = nextReview(prev?.review_level ?? null, correct, now)

  const row: ConceptMasteryRow = {
    user_id: userId,
    tag,
    strength: mastery.strength,
    state: mastery.state,
    attempts: mastery.attempts,
    correct: mastery.correct,
    last_seen: now.toISOString(),
    due_at: schedule.dueAt,
    review_level: schedule.level,
  }

  const { error: upsertError } = await client
    .from('concept_mastery')
    .upsert(row, { onConflict: 'user_id,tag' })

  if (upsertError) throw upsertError

  // Clearing a due review is what advances the learning streak. Fail-soft: a
  // streak bookkeeping error must not discard the recorded review result.
  try {
    await recordReviewActivity(client, userId, now)
  } catch (error) {
    console.error('recordReviewActivity failed', error)
  }

  return { tag, correct, state: mastery.state, dueAt: schedule.dueAt }
}
