import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  ConceptMasteryRow,
  Database,
  MasteryStateValue,
} from '../lib/database.types'
import { nextReview } from '../lib/review/scheduler'

type Client = SupabaseClient<Database>

// ---------------------------------------------------------------------------
// F1.2 — Pure mastery model
//
// A concept's `strength` (0..1) rises with correct retrieval and falls on a
// miss. The discrete `state` (seen -> practiced -> retained -> fluent) is
// derived from strength once the learner has at least one direct attempt. The
// spaced scheduler (F2) will later add decay so `retained` must be refreshed by
// delayed review; for now a clean full-lesson pass reaches `retained`.
// ---------------------------------------------------------------------------

export type MasteryState = MasteryStateValue

export type ConceptMastery = {
  tag: string
  strength: number
  state: MasteryState
  attempts: number
  correct: number
}

export type MasteryInput = Pick<
  ConceptMastery,
  'strength' | 'attempts' | 'correct'
> | null

/** Learning rate applied to the remaining gap on a correct retrieval. */
export const DIRECT_GAIN = 0.8
/** A miss multiplies strength (a desirable but recoverable setback). */
export const MISS_FACTOR = 0.5
/** Fraction of direct gain propagated to prerequisite concepts (FIRe). */
export const IMPLICIT_FRACTION = 0.5

const PRACTICED_AT = 0.5
const RETAINED_AT = 0.8
const FLUENT_AT = 0.95

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function deriveState(strength: number, attempts: number): MasteryState {
  if (attempts <= 0) return 'seen'
  if (strength >= FLUENT_AT) return 'fluent'
  if (strength >= RETAINED_AT) return 'retained'
  if (strength >= PRACTICED_AT) return 'practiced'
  return 'seen'
}

/** Updates a concept from a directly graded attempt. */
export function applyAttempt(
  tag: string,
  prev: MasteryInput,
  correct: boolean,
): ConceptMastery {
  const prevStrength = prev?.strength ?? 0
  const attempts = (prev?.attempts ?? 0) + 1
  const correctCount = (prev?.correct ?? 0) + (correct ? 1 : 0)
  const strength = correct
    ? clamp01(prevStrength + DIRECT_GAIN * (1 - prevStrength))
    : clamp01(prevStrength * MISS_FACTOR)
  return {
    tag,
    strength,
    attempts,
    correct: correctCount,
    state: deriveState(strength, attempts),
  }
}

/**
 * FIRe implicit credit: exercising an advanced concept lightly reinforces its
 * prerequisites. Positive-only and it does NOT fabricate attempts, so a concept
 * never directly practiced stays `seen` no matter how much implicit credit it
 * receives.
 */
export function applyImplicitCredit(
  tag: string,
  prev: MasteryInput,
  fraction = IMPLICIT_FRACTION,
): ConceptMastery {
  const prevStrength = prev?.strength ?? 0
  const attempts = prev?.attempts ?? 0
  const correct = prev?.correct ?? 0
  const strength = clamp01(
    prevStrength + fraction * DIRECT_GAIN * (1 - prevStrength),
  )
  return {
    tag,
    strength,
    attempts,
    correct,
    state: deriveState(strength, attempts),
  }
}

export const RETAINED_STATES: ReadonlySet<MasteryState> = new Set([
  'retained',
  'fluent',
])

export function isRetained(state: MasteryState | undefined): boolean {
  return state != null && RETAINED_STATES.has(state)
}

// ---------------------------------------------------------------------------
// F1.3 — Persistence
// ---------------------------------------------------------------------------

type LessonLike = {
  lessonId: string
  tags: string[]
  prerequisites: string[]
}

/** Tags of the lessons listed as direct prerequisites, excluding `exclude`. */
export function prerequisiteTags(
  lesson: LessonLike,
  lessonsById: ReadonlyMap<string, LessonLike>,
  exclude: ReadonlySet<string>,
): string[] {
  const tags = new Set<string>()
  for (const prereqId of lesson.prerequisites) {
    const prereq = lessonsById.get(prereqId)
    if (!prereq) continue
    for (const tag of prereq.tags) {
      if (!exclude.has(tag)) tags.add(tag)
    }
  }
  return [...tags]
}

export async function loadConceptMastery(
  client: Client,
  userId: string,
): Promise<ConceptMastery[]> {
  const { data, error } = await client
    .from('concept_mastery')
    .select('tag, strength, state, attempts, correct')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).map((row) => ({
    tag: row.tag,
    strength: row.strength,
    state: row.state,
    attempts: row.attempts,
    correct: row.correct,
  }))
}

/**
 * Records mastery from a finished lesson: direct credit to the lesson's own
 * concepts (completion implies every problem was answered correctly), plus FIRe
 * implicit credit to the concepts of its prerequisite lessons. Fail-soft: never
 * throws, so it cannot block lesson completion.
 */
export async function recordLessonMastery(
  client: Client,
  userId: string,
  lesson: LessonLike,
  allLessons: ReadonlyArray<LessonLike>,
): Promise<void> {
  try {
    const lessonsById = new Map(allLessons.map((l) => [l.lessonId, l]))
    const directTags = lesson.tags
    const directSet = new Set(directTags)
    const prereqTags = prerequisiteTags(lesson, lessonsById, directSet)

    const allTags = [...directTags, ...prereqTags]
    if (allTags.length === 0) return

    const { data: existing, error: loadError } = await client
      .from('concept_mastery')
      .select('tag, strength, attempts, correct, review_level, due_at')
      .eq('user_id', userId)
      .in('tag', allTags)

    if (loadError) throw loadError

    type PrevRow = {
      strength: number
      attempts: number
      correct: number
      review_level: number
      due_at: string | null
    }
    const prevByTag = new Map<string, PrevRow>(
      (existing ?? []).map((row) => [row.tag, row as PrevRow]),
    )

    const now = new Date()
    const nowIso = now.toISOString()

    const buildRow = (m: ConceptMastery, schedule: boolean): ConceptMasteryRow => {
      const prev = prevByTag.get(m.tag)
      let reviewLevel = prev?.review_level ?? 0
      let dueAt = prev?.due_at ?? null
      // Seed the first spaced review when a concept first reaches retained.
      if (schedule && isRetained(m.state) && !dueAt) {
        const next = nextReview(null, true, now)
        reviewLevel = next.level
        dueAt = next.dueAt
      }
      return {
        user_id: userId,
        tag: m.tag,
        strength: m.strength,
        state: m.state,
        attempts: m.attempts,
        correct: m.correct,
        last_seen: nowIso,
        due_at: dueAt,
        review_level: reviewLevel,
      }
    }

    const rows: ConceptMasteryRow[] = [
      ...directTags.map((tag) =>
        buildRow(applyAttempt(tag, prevByTag.get(tag) ?? null, true), true),
      ),
      ...prereqTags.map((tag) =>
        buildRow(applyImplicitCredit(tag, prevByTag.get(tag) ?? null), false),
      ),
    ]

    const { error: upsertError } = await client
      .from('concept_mastery')
      .upsert(rows, { onConflict: 'user_id,tag' })

    if (upsertError) throw upsertError
  } catch (error) {
    console.error('recordLessonMastery failed', error)
  }
}
