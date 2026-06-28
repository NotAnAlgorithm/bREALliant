import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  Database,
  Json,
  LessonProgressSnapshot,
  MasteryStateValue,
} from '../lib/database.types'
import { computeNextStreak, toUtcDateString } from './streak-logic'

type Client = SupabaseClient<Database>

function asRecord(value: Json | undefined): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function asStepStates(
  value: Json | undefined,
): Record<string, Record<string, unknown>> {
  const record = asRecord(value)
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => [
      key,
      asRecord(entry as Json | undefined),
    ]),
  )
}

function asStepAttempts(
  value: Json | undefined,
): Record<string, { correct: boolean; message: string }> {
  const record = asRecord(value)
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => {
      const attempt = asRecord(entry as Json | undefined)
      return [
        key,
        {
          correct: Boolean(attempt.correct),
          message: typeof attempt.message === 'string' ? attempt.message : '',
        },
      ]
    }),
  )
}

export async function loadLessonProgress(
  client: Client,
  userId: string,
  lessonId: string,
): Promise<LessonProgressSnapshot | null> {
  const { data, error } = await client
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    stepIndex: data.step_index,
    stepId: data.step_id,
    stepState: asRecord(data.step_state),
    stepStates: asStepStates(data.step_states),
    stepAttempts: asStepAttempts(data.step_attempts),
    completed: data.completed,
  }
}

export async function saveLessonProgress(
  client: Client,
  userId: string,
  lessonId: string,
  snapshot: LessonProgressSnapshot,
): Promise<void> {
  const { error } = await client.from('lesson_progress').upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      step_id: snapshot.stepId,
      step_index: snapshot.stepIndex,
      step_state: snapshot.stepState as Json,
      step_states: snapshot.stepStates as Json,
      step_attempts: snapshot.stepAttempts as Json,
      completed: snapshot.completed,
    },
    { onConflict: 'user_id,lesson_id' },
  )

  if (error) throw error
}

export async function completeLesson(
  client: Client,
  userId: string,
  lessonId: string,
  tags: string[],
): Promise<void> {
  const { error: completionError } = await client
    .from('lesson_completions')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        tags,
      },
      { onConflict: 'user_id,lesson_id' },
    )

  if (completionError) throw completionError

  const { error: progressError } = await client
    .from('lesson_progress')
    .update({ completed: true })
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)

  if (progressError) throw progressError
}

export type ConceptMasterySummary = {
  tag: string
  state: MasteryStateValue
  strength: number
}

export type CourseProgressSummary = {
  completedIds: string[]
  inProgressIds: string[]
  mastery: ConceptMasterySummary[]
}

export async function loadCourseProgress(
  client: Client,
  userId: string,
): Promise<CourseProgressSummary> {
  const [completions, progress, mastery] = await Promise.all([
    client.from('lesson_completions').select('lesson_id').eq('user_id', userId),
    client
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', userId),
    client
      .from('concept_mastery')
      .select('tag, state, strength')
      .eq('user_id', userId),
  ])

  if (completions.error) throw completions.error
  if (progress.error) throw progress.error
  if (mastery.error) throw mastery.error

  const completedIds = (completions.data ?? []).map((row) => row.lesson_id)
  const completedSet = new Set(completedIds)
  const inProgressIds = (progress.data ?? [])
    .filter((row) => !row.completed && !completedSet.has(row.lesson_id))
    .map((row) => row.lesson_id)
  const masterySummary = (mastery.data ?? []).map((row) => ({
    tag: row.tag,
    state: row.state,
    strength: row.strength,
  }))

  return { completedIds, inProgressIds, mastery: masterySummary }
}

export async function loadStreak(
  client: Client,
  userId: string,
): Promise<number> {
  const { data, error } = await client
    .from('streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data?.current_streak ?? 0
}

/**
 * Advances the learning streak for a single day of retrieval practice. This is
 * bound to spaced reviews: it is called when a learner clears a due review (see
 * `recordReview`), NOT on ordinary lesson saves/completions. A review attempt
 * counts whether it was correct or not — showing up to practice is the habit
 * we reward. `computeNextStreak` makes repeat calls within the same UTC day a
 * no-op, so at most one bump happens per day.
 */
export async function recordReviewActivity(
  client: Client,
  userId: string,
  now: Date = new Date(),
): Promise<void> {
  const today = toUtcDateString(now)

  const { data: existing, error: fetchError } = await client
    .from('streaks')
    .select('current_streak, last_activity_date')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) throw fetchError

  const next = computeNextStreak(
    existing?.current_streak ?? 0,
    existing?.last_activity_date ?? null,
    today,
  )

  const { error: upsertError } = await client.from('streaks').upsert(
    {
      user_id: userId,
      current_streak: next.current_streak,
      last_activity_date: next.last_activity_date,
    },
    { onConflict: 'user_id' },
  )

  if (upsertError) throw upsertError
}
