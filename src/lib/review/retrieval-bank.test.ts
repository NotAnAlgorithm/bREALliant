import { describe, expect, it } from 'vitest'

import type { Lesson } from '@content/schemas'
import { buildRetrievalBank, pickReviewItem } from './retrieval-bank'

function gradedItem(id: string) {
  return {
    id,
    prompt: `prompt ${id}`,
    widget: { kind: 'multiple_choice' as const, props: { choices: [] } },
    validator: { type: 'set_match' as const, engine: 'mathjs' as const, accept: ['a'] },
    feedback: { correct: 'yes', incorrect: [{ match: '*', message: 'no' }] },
  }
}

function lesson(partial: Partial<Lesson>): Lesson {
  return {
    lessonId: 'l',
    title: 't',
    tags: [],
    prerequisites: [],
    glossary: {},
    steps: [],
    ...partial,
  } as Lesson
}

describe('buildRetrievalBank', () => {
  it('indexes a lesson quiz items under each of its tags', () => {
    const bank = buildRetrievalBank([
      lesson({
        lessonId: 'l1',
        tags: ['lub', 'supremum'],
        steps: [{ id: 's1', type: 'quiz', items: [gradedItem('q1')] }],
      }),
    ])

    expect(bank.get('lub')?.map((i) => i.id)).toEqual(['q1'])
    expect(bank.get('supremum')?.map((i) => i.id)).toEqual(['q1'])
  })

  it('indexes an item under its own tags when present (F3.1)', () => {
    const tagged = { ...gradedItem('q1'), tags: ['supremum'] }
    const bank = buildRetrievalBank([
      lesson({
        lessonId: 'l1',
        tags: ['lub', 'completeness'],
        steps: [{ id: 's1', type: 'quiz', items: [tagged] }],
      }),
    ])

    expect(bank.get('supremum')?.map((i) => i.id)).toEqual(['q1'])
    // Lesson-level tags are not used when the item specifies its own.
    expect(bank.has('lub')).toBe(false)
    expect(bank.has('completeness')).toBe(false)
  })

  it('prefers an explicit retrievalBank over quiz items', () => {
    const bank = buildRetrievalBank([
      lesson({
        lessonId: 'l1',
        tags: ['lub'],
        retrievalBank: [gradedItem('r1')],
        steps: [{ id: 's1', type: 'quiz', items: [gradedItem('q1')] }],
      }),
    ])

    expect(bank.get('lub')?.map((i) => i.id)).toEqual(['r1'])
  })

  it('skips ungraded items and tagless/itemless lessons', () => {
    const ungraded = {
      id: 'u1',
      prompt: 'p',
      widget: { kind: 'multiple_choice' as const, props: { choices: [] } },
    }
    const bank = buildRetrievalBank([
      lesson({
        lessonId: 'l1',
        tags: ['lub'],
        steps: [{ id: 's1', type: 'quiz', items: [ungraded] }],
      }),
    ])

    expect(bank.has('lub')).toBe(false)
  })

  it('merges curated concept-bank items under each of their own tags', () => {
    const lessons = [
      lesson({
        lessonId: 'l1',
        tags: ['compactness'],
        steps: [{ id: 's1', type: 'quiz', items: [gradedItem('q1')] }],
      }),
    ]
    // A multi-tag curated problem authored once, plus a single-tag one.
    const curated = [
      { ...gradedItem('c1'), tags: ['compactness', 'heine-borel'], difficulty: 3 },
      { ...gradedItem('c2'), tags: ['supremum'], difficulty: 1 },
    ]

    const bank = buildRetrievalBank(lessons, curated)

    // Appended to the lesson's existing pool for a shared tag.
    expect(bank.get('compactness')?.map((i) => i.id)).toEqual(['q1', 'c1'])
    // Indexed under every tag a multi-tag item declares.
    expect(bank.get('heine-borel')?.map((i) => i.id)).toEqual(['c1'])
    // And a brand-new concept pool from a curated-only tag.
    expect(bank.get('supremum')?.map((i) => i.id)).toEqual(['c2'])
  })

  it('skips ungraded or untagged curated items', () => {
    const ungraded = {
      id: 'u1',
      prompt: 'p',
      widget: { kind: 'multiple_choice' as const, props: { choices: [] } },
      tags: ['compactness'],
    }
    const untagged = { ...gradedItem('c3') } // no tags -> nowhere to file it
    const bank = buildRetrievalBank([], [ungraded, untagged])

    expect(bank.size).toBe(0)
  })
})

describe('pickReviewItem', () => {
  it('returns null for a tag with no items', () => {
    expect(pickReviewItem(new Map(), 'missing')).toBeNull()
  })

  it('rotates deterministically with the index', () => {
    const bank = buildRetrievalBank([
      lesson({
        lessonId: 'l1',
        tags: ['lub'],
        steps: [
          { id: 's1', type: 'quiz', items: [gradedItem('a'), gradedItem('b')] },
        ],
      }),
    ])

    expect(pickReviewItem(bank, 'lub', 0)?.id).toBe('a')
    expect(pickReviewItem(bank, 'lub', 1)?.id).toBe('b')
    expect(pickReviewItem(bank, 'lub', 2)?.id).toBe('a')
  })

  it('orders by the difficulty ramp when a mastery state is given', () => {
    const easy = { ...gradedItem('easy'), difficulty: 1 }
    const hard = { ...gradedItem('hard'), difficulty: 3 }
    // Bank insertion order is hard-first to prove ordering is by difficulty,
    // not insertion.
    const bank = new Map([['lub', [hard, easy]]])

    // A 'practiced' concept should surface the standard (d1) item first.
    expect(pickReviewItem(bank, 'lub', 0, 'practiced')?.id).toBe('easy')
    // A 'fluent' concept should surface the challenge (d3) item first.
    expect(pickReviewItem(bank, 'lub', 0, 'fluent')?.id).toBe('hard')
    // Without a state, it falls back to plain insertion-order rotation.
    expect(pickReviewItem(bank, 'lub', 0)?.id).toBe('hard')
  })

  it('skips excluded items so a shared problem is not shown twice', () => {
    const bank = new Map([['lub', [gradedItem('a'), gradedItem('b')]]])
    // 'a' already placed elsewhere → the next unused item is returned.
    expect(pickReviewItem(bank, 'lub', 0, undefined, new Set(['a']))?.id).toBe('b')
  })

  it('returns null when every item for the tag is already excluded', () => {
    const bank = new Map([['lub', [gradedItem('a'), gradedItem('b')]]])
    expect(
      pickReviewItem(bank, 'lub', 0, undefined, new Set(['a', 'b'])),
    ).toBeNull()
  })
})
