import { describe, expect, it } from 'vitest'

import type { MasteryState } from '../../services/mastery'
import {
  pickContinueLesson,
  pickRemediation,
  recommendNextUp,
  type LessonMeta,
  type RecommendInput,
} from './next-up'

const LESSONS: LessonMeta[] = [
  { lessonId: 'l1', title: 'Bounds', tags: ['bounds'], prerequisites: [] },
  { lessonId: 'l2', title: 'LUB', tags: ['lub'], prerequisites: ['l1'] },
  { lessonId: 'l3', title: 'Sequences', tags: ['sequence'], prerequisites: ['l2'] },
]

function mastery(
  entries: Array<[string, MasteryState, number]>,
): RecommendInput['mastery'] {
  return entries.map(([tag, state, strength]) => ({ tag, state, strength }))
}

function makeInput(overrides: Partial<RecommendInput> = {}): RecommendInput {
  return {
    orderedLessonIds: ['l1', 'l2', 'l3'],
    lessonsById: new Map(LESSONS.map((l) => [l.lessonId, l])),
    completedIds: new Set(),
    retainedTags: new Set(),
    mastery: [],
    dueCount: 0,
    ...overrides,
  }
}

describe('recommendNextUp priority ladder', () => {
  it('recommends review first when concepts are due', () => {
    const rec = recommendNextUp(makeInput({ dueCount: 3, completedIds: new Set(['l1']) }))
    expect(rec.kind).toBe('review')
    expect(rec.href).toBe('/review')
    expect(rec.dueCount).toBe(3)
  })

  it('recommends the first lesson for a brand-new learner', () => {
    const rec = recommendNextUp(makeInput())
    expect(rec.kind).toBe('continue')
    expect(rec.lessonId).toBe('l1')
    expect(rec.href).toBe('/lesson/l1')
  })

  it('continues to the next unlocked lesson after completions', () => {
    const rec = recommendNextUp(
      makeInput({
        completedIds: new Set(['l1', 'l2']),
        retainedTags: new Set(['bounds', 'lub']),
      }),
    )
    expect(rec.kind).toBe('continue')
    expect(rec.lessonId).toBe('l3')
  })

  it('treats fully-retained lessons as satisfied prerequisites', () => {
    // l1 not "completed" but its tag is retained -> l2 should unlock.
    const rec = recommendNextUp(
      makeInput({
        completedIds: new Set(),
        retainedTags: new Set(['bounds']),
        mastery: mastery([['bounds', 'retained', 0.85]]),
      }),
    )
    expect(rec.kind).toBe('continue')
    expect(rec.lessonId).toBe('l2')
  })

  it('remediates a decayed concept before continuing', () => {
    const rec = recommendNextUp(
      makeInput({
        completedIds: new Set(['l1', 'l2']),
        // lub decayed below the floor (a missed review), bounds still solid.
        retainedTags: new Set(['bounds']),
        mastery: mastery([
          ['bounds', 'retained', 0.85],
          ['lub', 'seen', 0.4],
        ]),
      }),
    )
    expect(rec.kind).toBe('remediate')
    expect(rec.tag).toBe('lub')
    expect(rec.lessonId).toBe('l2')
    expect(rec.href).toBe('/lesson/l2')
  })

  it('does not remediate concepts merely "practiced" above the floor', () => {
    const rec = recommendNextUp(
      makeInput({
        completedIds: new Set(['l1', 'l2']),
        retainedTags: new Set(['bounds']),
        mastery: mastery([
          ['bounds', 'retained', 0.85],
          ['lub', 'practiced', 0.65],
        ]),
      }),
    )
    // lub is mid-strength (scheduled review will handle it) -> move on.
    expect(rec.kind).toBe('continue')
    expect(rec.lessonId).toBe('l3')
  })

  it('suggests interleaved practice once the path is exhausted', () => {
    const rec = recommendNextUp(
      makeInput({
        completedIds: new Set(['l1', 'l2', 'l3']),
        retainedTags: new Set(['bounds', 'lub', 'sequence']),
        mastery: mastery([
          ['bounds', 'retained', 0.85],
          ['lub', 'retained', 0.85],
          ['sequence', 'retained', 0.85],
        ]),
      }),
    )
    expect(rec.kind).toBe('practice')
    expect(rec.href).toBe('/practice')
  })

  it('falls back to caught_up when nothing is engaged or available', () => {
    const rec = recommendNextUp(
      makeInput({
        orderedLessonIds: [],
        lessonsById: new Map(),
      }),
    )
    expect(rec.kind).toBe('caught_up')
  })

  it('prioritizes review even when a concept has also decayed', () => {
    const rec = recommendNextUp(
      makeInput({
        dueCount: 1,
        completedIds: new Set(['l1', 'l2']),
        mastery: mastery([['lub', 'seen', 0.4]]),
      }),
    )
    expect(rec.kind).toBe('review')
  })
})

describe('pickContinueLesson / pickRemediation', () => {
  it('returns null continuation when everything is satisfied', () => {
    expect(
      pickContinueLesson(
        makeInput({
          completedIds: new Set(['l1', 'l2', 'l3']),
        }),
      ),
    ).toBeNull()
  })

  it('picks the weakest decayed concept when several have slipped', () => {
    const result = pickRemediation(
      makeInput({
        completedIds: new Set(['l1', 'l2']),
        mastery: mastery([
          ['bounds', 'seen', 0.45],
          ['lub', 'seen', 0.2],
        ]),
      }),
    )
    expect(result?.tag).toBe('lub')
  })
})
