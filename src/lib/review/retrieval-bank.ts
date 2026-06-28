// F2.2 — Retrieval bank: maps each concept tag to graded items that can test it.
//
// Source per lesson: the lesson's optional `retrievalBank`, falling back to its
// quiz items. Each graded item is indexed under every tag of its lesson (until
// per-step tags land in F3.1). Pure and dependency-light.

import type { Lesson, QuizItem } from '@content/schemas'

/** A quiz item with both validator and feedback present (gradeable). */
export type GradedItem = QuizItem & {
  validator: NonNullable<QuizItem['validator']>
  feedback: NonNullable<QuizItem['feedback']>
}

function isGraded(item: QuizItem): item is GradedItem {
  return item.validator != null && item.feedback != null
}

function lessonRetrievalItems(lesson: Lesson): GradedItem[] {
  if (lesson.retrievalBank && lesson.retrievalBank.length > 0) {
    return lesson.retrievalBank.filter(isGraded)
  }
  return lesson.steps
    .filter((step) => step.type === 'quiz')
    .flatMap((step) => (step.type === 'quiz' ? step.items : []))
    .filter(isGraded)
}

export type RetrievalBank = Map<string, GradedItem[]>

/** Tags an item is indexed under: its own (F3.1) or the lesson's as fallback. */
function itemTags(item: GradedItem, lesson: Lesson): string[] {
  return item.tags && item.tags.length > 0 ? item.tags : lesson.tags
}

export function buildRetrievalBank(
  lessons: ReadonlyArray<Lesson>,
): RetrievalBank {
  const bank: RetrievalBank = new Map()
  for (const lesson of lessons) {
    for (const item of lessonRetrievalItems(lesson)) {
      for (const tag of itemTags(item, lesson)) {
        const existing = bank.get(tag)
        if (existing) existing.push(item)
        else bank.set(tag, [item])
      }
    }
  }
  return bank
}

/** Deterministically pick one item for a tag (rotates with `index`). */
export function pickReviewItem(
  bank: RetrievalBank,
  tag: string,
  index = 0,
): GradedItem | null {
  const items = bank.get(tag)
  if (!items || items.length === 0) return null
  return items[Math.abs(index) % items.length]
}
