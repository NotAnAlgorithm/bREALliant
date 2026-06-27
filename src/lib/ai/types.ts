// Shared AI types for the grounded-hint feature (F6).
//
// Design invariant (verifier-first): the AI layer NEVER decides correctness and
// NEVER reveals the final answer. The math.js validator in
// `src/lib/validators/run-validator.ts` remains the single source of truth.

export type ChatRole = 'system' | 'user'

export type ChatMessage = {
  role: ChatRole
  content: string
}

/**
 * Structured, grounded context for a hint request. Built on the client from the
 * lesson's existing content model (no new authoring required) and sent to the
 * `hint` edge function. The accepted answers are included only so the model can
 * steer toward them; the system prompt forbids revealing them.
 */
export type HintContext = {
  /** Lesson title for light framing. */
  lessonTitle?: string
  /** The problem prompt the learner is working on. */
  stepPrompt?: string
  /** Widget kind (e.g. `fill_blank`, `multiple_choice`) for answer-format awareness. */
  widgetKind: string
  /** Authored correct answer(s) from `validator.accept`. Never to be revealed. */
  correctAnswers: string[]
  /** Authored misconception patterns from `feedback.incorrect`. */
  incorrectPatterns: Array<{ match: string; message: string }>
  /** The learner's most recent (incorrect) answer, as a normalized string. */
  learnerAnswer: string
  /** Progressive hint level: 1 = gentle nudge, 2 = schema cue, 3 = near-step. */
  hintLevel: number
  /** Optional per-concept mastery summary (populated once F1 lands; empty before). */
  masterySummary?: string
}

export type HintResult = {
  hint: string
}
