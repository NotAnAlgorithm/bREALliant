// F6.1 — Grounding / prompt builder (pure, dependency-free, testable).
//
// Two responsibilities, both pure:
//   1. buildHintContext: extract structured, grounded context from the existing
//      content model (a problem step or graded quiz item) + the learner attempt.
//   2. buildHintMessages: turn that context into chat messages whose system
//      prompt enforces the verifier-first, never-reveal-the-answer, progressive,
//      schema-cue hint policy (Insight 7; SPOV C).
//
// Kept free of `@content` aliases, React, and Vite env so it stays trivially
// unit-testable and portable. The edge function re-asserts the same guard
// server-side, so tampering with a client-built prompt cannot leak answers.

import type { ChatMessage, HintContext } from './types'

/** Minimal structural shape of a graded problem/quiz item — avoids importing the
 * full content discriminated union while matching it structurally. */
export type GradedProblemLike = {
  prompt?: string
  widget: { kind: string }
  validator: { accept: string[] }
  feedback: { incorrect: Array<{ match: string; message: string }> }
}

export type BuildHintContextParams = {
  problem: GradedProblemLike
  learnerAnswer: string
  hintLevel: number
  lessonTitle?: string
  masterySummary?: string
}

export function buildHintContext({
  problem,
  learnerAnswer,
  hintLevel,
  lessonTitle,
  masterySummary,
}: BuildHintContextParams): HintContext {
  return {
    lessonTitle,
    stepPrompt: problem.prompt,
    widgetKind: problem.widget.kind,
    correctAnswers: [...problem.validator.accept],
    incorrectPatterns: problem.feedback.incorrect.map((entry) => ({
      match: entry.match,
      message: entry.message,
    })),
    learnerAnswer,
    hintLevel: clampLevel(hintLevel),
    masterySummary,
  }
}

export const MAX_HINT_LEVEL = 3

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 1
  return Math.min(MAX_HINT_LEVEL, Math.max(1, Math.round(level)))
}

const LEVEL_GUIDANCE: Record<number, string> = {
  1: 'Level 1 (gentle nudge): re-orient the learner. Point at what the problem is really asking or which definition is in play. Do not name the full method yet.',
  2: 'Level 2 (schema cue): name the relevant concept or canonical move for this category of problem (e.g. "use the least upper bound property", "bound it with the triangle inequality"). Do not carry out the steps.',
  3: 'Level 3 (near-step): walk through the first concrete step of the reasoning, still WITHOUT stating the final answer the learner must produce.',
}

/**
 * Canonical hint system prompt. The edge function prepends its own copy of this
 * policy server-side; keep the two in sync (see supabase/functions/hint).
 */
export const HINT_SYSTEM_PROMPT = [
  'You are a patient real-analysis tutor embedded in a learn-by-doing app.',
  'Your job is to help a learner who just answered a problem incorrectly get unstuck WITHOUT doing the work for them.',
  '',
  'Hard rules (never violate):',
  '- NEVER reveal the final answer, nor any value/expression that is mathematically equivalent to it.',
  '- NEVER state a complete solution. Offer the smallest useful nudge for the requested hint level.',
  '- You do NOT decide correctness; a separate verifier already did. Do not tell the learner whether a new answer would be right.',
  '- Ground every hint in the provided problem context. Do not invent facts or theorems. If unsure, give a conceptual orientation only.',
  '- Prefer naming the relevant definition, theorem, or problem category (the "deep structure") over more trial-and-error.',
  '- Be concise (1-3 sentences) and encouraging. Use plain language; inline LaTeX with $...$ is fine.',
  '',
  'The correct answer(s) are provided ONLY so you can steer toward them. Treat them as secret.',
].join('\n')

export function buildHintMessages(context: HintContext): ChatMessage[] {
  const level = clampLevel(context.hintLevel)

  const lines: string[] = []
  if (context.lessonTitle) lines.push(`Lesson: ${context.lessonTitle}`)
  if (context.stepPrompt) lines.push(`Problem: ${context.stepPrompt}`)
  lines.push(`Answer format (widget): ${context.widgetKind}`)
  lines.push(
    `Learner's incorrect answer: ${context.learnerAnswer || '(no answer entered)'}`,
  )
  lines.push(
    `Correct answer(s) — SECRET, never reveal: ${context.correctAnswers.join(' | ')}`,
  )
  if (context.incorrectPatterns.length > 0) {
    const known = context.incorrectPatterns
      .map((p) => `- if answer matches "${p.match}": ${p.message}`)
      .join('\n')
    lines.push(`Known misconceptions (author-written):\n${known}`)
  }
  if (context.masterySummary) {
    lines.push(`Learner mastery context: ${context.masterySummary}`)
  }
  lines.push('')
  lines.push(LEVEL_GUIDANCE[level])
  lines.push(
    'Write only the hint text for this level. Do not include the answer.',
  )

  return [
    { role: 'system', content: HINT_SYSTEM_PROMPT },
    { role: 'user', content: lines.join('\n') },
  ]
}
