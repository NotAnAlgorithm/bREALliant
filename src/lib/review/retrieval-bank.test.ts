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
})
