// F8.2 — Verifier gate (pure). The keystone of "never a wrong answer".
//
// Every generated problem item — whether produced by the deterministic template
// engine or proposed by the LLM — MUST pass through verifyCandidate before it is
// ever shown to a learner. Verification reuses the EXACT same `runValidator`
// the learner will be graded against, so a served item is provably gradeable:
// its declared validator accepts a known-correct answer. Anything that cannot be
// proven correct is dropped.

import type { QuizItem } from '@content/schemas'

import { runValidator } from '../validators/run-validator'

export type GeneratedCandidate = {
  /** Concept tag this item drills (for bank routing / interleaving). */
  tag: string
  /** The graded item to potentially serve. Validator + feedback required. */
  item: QuizItem
  /**
   * A known-correct answer the validator MUST accept. For template items this is
   * computed deterministically; for LLM items it is the math.js evaluation of the
   * proposed expression (never the model's free-text claim).
   */
  selfTestAnswer: string
  /** Optional secondary claim to cross-check; if present it must also validate. */
  claimedAnswer?: string
}

export type VerifiedItem = QuizItem & { tag: string }

/** Returns the verified item, or null if it cannot be proven correct. */
export function verifyCandidate(candidate: GeneratedCandidate): VerifiedItem | null {
  const { item, selfTestAnswer, claimedAnswer, tag } = candidate

  if (!item.validator || !item.feedback) return null
  if (typeof selfTestAnswer !== 'string' || selfTestAnswer.trim() === '') {
    return null
  }

  // The authoritative check: the item's own validator must accept the
  // known-correct answer. If not, the generator produced a broken item.
  if (!runValidator(item.validator, selfTestAnswer)) return null

  // If a separate claim was provided (e.g. LLM's stated answer), it must agree.
  if (
    claimedAnswer != null &&
    !runValidator(item.validator, claimedAnswer)
  ) {
    return null
  }

  return { ...item, tag }
}

/** Verifies a batch, silently dropping anything unverifiable. */
export function verifyAll(candidates: GeneratedCandidate[]): VerifiedItem[] {
  return candidates.flatMap((candidate) => {
    const verified = verifyCandidate(candidate)
    return verified ? [verified] : []
  })
}
