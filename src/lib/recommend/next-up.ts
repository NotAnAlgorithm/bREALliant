// Adaptive "Next up" recommender (pure).
//
// Given the learner's progress, mastery, and due reviews, decide the single most
// valuable next action. The policy is a fixed, explainable priority ladder —
// each branch is grounded in learning science, and every recommendation carries
// a `reason` so the path is transparent (not a black box) to the learner.
//
// Priority:
//   1. review     — clear due spaced reviews first (retrieval at the edge of
//                    forgetting is the highest-yield minute of study).
//   2. remediate  — a previously-learned concept has decayed below a safe floor;
//                    shore up the foundation before advancing (mastery learning).
//   3. continue   — start the next lesson whose prerequisites are satisfied.
//   4. practice   — path exhausted and nothing due: interleave to stay durable.
//   5. caught_up  — genuinely nothing actionable yet.

import type { Lesson } from '@content/schemas'

import type { MasteryState } from '../../services/mastery'

export type RecommendationKind =
  | 'review'
  | 'remediate'
  | 'continue'
  | 'practice'
  | 'caught_up'

export type Recommendation = {
  kind: RecommendationKind
  title: string
  reason: string
  cta: string
  href: string
  lessonId?: string
  tag?: string
  dueCount?: number
}

export type LessonMeta = Pick<
  Lesson,
  'lessonId' | 'title' | 'tags' | 'prerequisites'
>

export type MasterySummary = {
  tag: string
  state: MasteryState
  strength: number
}

export type RecommendInput = {
  orderedLessonIds: readonly string[]
  lessonsById: ReadonlyMap<string, LessonMeta>
  completedIds: ReadonlySet<string>
  retainedTags: ReadonlySet<string>
  mastery: readonly MasterySummary[]
  dueCount: number
}

const STATE_RANK: Record<MasteryState, number> = {
  seen: 0,
  practiced: 1,
  retained: 2,
  fluent: 3,
}

/**
 * Strength below which a concept from already-completed material is treated as
 * a genuine weakness worth revisiting (a clean lesson pass reaches ~0.8, and a
 * single missed review halves it to ~0.4, so 0.5 fires only on real slippage).
 */
export const REMEDIATION_STRENGTH = 0.5

/** Turn a kebab/identifier tag into human-readable words. */
export function labelizeTag(tag: string): string {
  return tag.replace(/[-_]/g, ' ')
}

function lessonFullyRetained(
  lesson: LessonMeta,
  retainedTags: ReadonlySet<string>,
): boolean {
  return (
    lesson.tags.length > 0 && lesson.tags.every((tag) => retainedTags.has(tag))
  )
}

/** Lessons that count as "done" for unlock: completed OR fully retained. */
function satisfiedSet(input: RecommendInput): Set<string> {
  const satisfied = new Set(input.completedIds)
  for (const id of input.orderedLessonIds) {
    const lesson = input.lessonsById.get(id)
    if (lesson && lessonFullyRetained(lesson, input.retainedTags)) {
      satisfied.add(id)
    }
  }
  return satisfied
}

/** First not-yet-satisfied lesson whose prerequisites are all satisfied. */
export function pickContinueLesson(input: RecommendInput): LessonMeta | null {
  const satisfied = satisfiedSet(input)
  for (const id of input.orderedLessonIds) {
    if (satisfied.has(id)) continue
    const lesson = input.lessonsById.get(id)
    if (!lesson) continue
    if (lesson.prerequisites.every((p) => satisfied.has(p))) return lesson
  }
  return null
}

/**
 * The weakest concept from an already-completed lesson that has decayed below
 * the remediation floor, paired with the earliest completed lesson that teaches
 * it (the best place to rebuild it). Null when nothing needs shoring up.
 */
export function pickRemediation(
  input: RecommendInput,
): { tag: string; lesson: LessonMeta } | null {
  const masteryByTag = new Map(input.mastery.map((m) => [m.tag, m]))

  let weakest: { tag: string; state: MasteryState; strength: number } | null =
    null
  const seen = new Set<string>()

  for (const id of input.orderedLessonIds) {
    if (!input.completedIds.has(id)) continue
    const lesson = input.lessonsById.get(id)
    if (!lesson) continue
    for (const tag of lesson.tags) {
      if (seen.has(tag)) continue
      seen.add(tag)
      // retainedTags is the authoritative "solid" signal; never remediate it.
      if (input.retainedTags.has(tag)) continue
      // Only assess concepts we actually have a mastery record for; a missing
      // row means "no evidence", not "weak", so we don't nag about it.
      const m = masteryByTag.get(tag)
      if (!m) continue
      if (m.state === 'retained' || m.state === 'fluent') continue
      if (m.strength >= REMEDIATION_STRENGTH) continue
      if (
        weakest === null ||
        STATE_RANK[m.state] < STATE_RANK[weakest.state] ||
        (STATE_RANK[m.state] === STATE_RANK[weakest.state] &&
          m.strength < weakest.strength)
      ) {
        weakest = { tag, state: m.state, strength: m.strength }
      }
    }
  }

  if (!weakest) return null

  // Earliest completed lesson (in course order) that teaches the weak concept.
  for (const id of input.orderedLessonIds) {
    if (!input.completedIds.has(id)) continue
    const lesson = input.lessonsById.get(id)
    if (lesson && lesson.tags.includes(weakest.tag)) {
      return { tag: weakest.tag, lesson }
    }
  }
  return null
}

export function recommendNextUp(input: RecommendInput): Recommendation {
  // 1. Due spaced reviews — time-sensitive, highest yield.
  if (input.dueCount > 0) {
    return {
      kind: 'review',
      title:
        input.dueCount === 1
          ? '1 concept is due for review'
          : `${input.dueCount} concepts are due for review`,
      reason:
        'Retrieving a concept just as it starts to fade is the most efficient way to lock it into long-term memory.',
      cta: 'Review now',
      href: '/review',
      dueCount: input.dueCount,
    }
  }

  // 2. Remediate a decayed foundation before building on it.
  const remediation = pickRemediation(input)
  if (remediation) {
    return {
      kind: 'remediate',
      title: `Shore up "${remediation.lesson.title}"`,
      reason: `Your grip on ${labelizeTag(
        remediation.tag,
      )} has slipped. A quick revisit rebuilds the foundation before you go further.`,
      cta: 'Revisit',
      href: `/lesson/${remediation.lesson.lessonId}`,
      lessonId: remediation.lesson.lessonId,
      tag: remediation.tag,
    }
  }

  // 3. Continue to the next unlocked lesson.
  const next = pickContinueLesson(input)
  if (next) {
    return {
      kind: 'continue',
      title: next.title,
      reason:
        'Its prerequisites are solid, so you have the background to learn this next.',
      cta: 'Start lesson',
      href: `/lesson/${next.lessonId}`,
      lessonId: next.lessonId,
    }
  }

  // 4. Path exhausted but nothing due: keep recall durable with interleaving.
  const hasEngaged = input.mastery.some((m) => m.state !== 'seen')
  if (hasEngaged) {
    return {
      kind: 'practice',
      title: 'Keep your skills sharp',
      reason:
        "You've cleared the path and nothing is due yet — interleaved practice mixes concepts to strengthen transfer.",
      cta: 'Mixed practice',
      href: '/practice',
    }
  }

  // 5. Nothing actionable.
  return {
    kind: 'caught_up',
    title: "You're all caught up",
    reason: 'Nothing is due right now. Check back later for spaced reviews.',
    cta: 'Back to path',
    href: '/',
  }
}
