// F2.2 — Retrieval bank: maps each concept tag to graded items that can test it.
//
// Source per lesson: the lesson's optional `retrievalBank`, falling back to its
// quiz items. Each graded item is indexed under every tag of its lesson (until
// per-step tags land in F3.1). Pure and dependency-light.

import type { Lesson, QuizItem } from '@content/schemas'

import type { MasteryState } from '../../services/mastery'
import { itemDifficulty, orderByDifficulty } from './difficulty'

/** Append an item to a tag's pool, creating the pool on first use. */
function pushItem(bank: RetrievalBank, tag: string, item: GradedItem): void {
  const existing = bank.get(tag)
  if (existing) existing.push(item)
  else bank.set(tag, [item])
}

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
  conceptBankItems: ReadonlyArray<QuizItem> = [],
): RetrievalBank {
  const bank: RetrievalBank = new Map()
  for (const lesson of lessons) {
    for (const item of lessonRetrievalItems(lesson)) {
      for (const tag of itemTags(item, lesson)) {
        pushItem(bank, tag, item)
      }
    }
  }
  // Curated concept-bank items carry their OWN tags (there is no lesson to fall
  // back to), so a multi-tag problem is indexed under each tag it declares.
  // Ungraded or untagged entries are skipped rather than silently mis-filed.
  for (const item of conceptBankItems) {
    if (!isGraded(item)) continue
    for (const tag of item.tags ?? []) {
      pushItem(bank, tag, item)
    }
  }
  return bank
}

/**
 * Deterministically pick one item for a tag, rotating with `index`. When a
 * mastery `state` is supplied, the pool is first ordered by the difficulty ramp
 * for that state, so successive reviews surface difficulties matching mastery.
 *
 * `exclude` lets a caller assembling several cards avoid showing the SAME
 * underlying problem twice: a multi-tag item is reachable from each of its tags,
 * so without this two due concepts could surface the identical card. Starting at
 * the rotation index, the first item whose id is not excluded is returned;
 * `null` if every item for the tag is already excluded.
 */
export function pickReviewItem(
  bank: RetrievalBank,
  tag: string,
  index = 0,
  state?: MasteryState,
  exclude?: ReadonlySet<string>,
): GradedItem | null {
  const items = bank.get(tag)
  if (!items || items.length === 0) return null
  const ordered = state
    ? orderByDifficulty(items, state, itemDifficulty)
    : items
  const start = Math.abs(index) % ordered.length
  if (!exclude || exclude.size === 0) return ordered[start]
  for (let offset = 0; offset < ordered.length; offset += 1) {
    const candidate = ordered[(start + offset) % ordered.length]
    if (!exclude.has(candidate.id)) return candidate
  }
  return null
}
