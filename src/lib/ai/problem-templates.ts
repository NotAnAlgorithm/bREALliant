// F8.1 — Generation templating: concept -> candidate problem spec.
//
// Two grounded sources of candidates, both flowing through the F8.2 verifier:
//   1. Deterministic, parametric templates (authoritative): WE own the
//      prompt->answer mapping, so the answer is computed, not guessed. These
//      need no LLM and provide the always-available, hallucination-free baseline
//      (works with AI off).
//   2. LLM proposals: the model returns a prompt + a math.js answer EXPRESSION.
//      We evaluate the expression ourselves to derive the authoritative answer
//      (never trusting free text), then verify. This adds surface variety while
//      the verifier guarantees correctness.
//
// Fixed deep structure, varied surface — the interleaving/transfer goal (SPOV D).

import { all, create } from 'mathjs'

import type { QuizItem } from '@content/schemas'
import type { Validator } from '@content/schemas/validators'

import type { ChatMessage } from './types'
import type { GeneratedCandidate } from './verify-generated'

const math = create(all, {})

type Rng = () => number

/** Deterministic PRNG (mulberry32) so a seed reproduces the same items. */
function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1))
}

function distinctInts(rng: Rng, count: number, lo: number, hi: number): number[] {
  const seen = new Set<number>()
  while (seen.size < count) seen.add(randInt(rng, lo, hi))
  return [...seen]
}

const STANDARD_FEEDBACK = {
  correct: 'Correct.',
  incorrect: [
    {
      match: '*',
      message: 'Re-read the definition for this concept and try again.',
    },
  ],
} as const

function fillBlankItem(
  id: string,
  prompt: string,
  validator: Validator,
): QuizItem {
  return {
    id,
    prompt,
    widget: { kind: 'fill_blank', props: {} },
    validator,
    feedback: {
      correct: STANDARD_FEEDBACK.correct,
      incorrect: STANDARD_FEEDBACK.incorrect.map((f) => ({ ...f })),
    },
  }
}

type ProblemTemplate = {
  id: string
  tags: string[]
  generate: (rng: Rng, index: number) => GeneratedCandidate
}

const TEMPLATES: ProblemTemplate[] = [
  {
    id: 'sup-finite-set',
    tags: ['supremum', 'bounds', 'lub'],
    generate: (rng, index) => {
      const values = distinctInts(rng, randInt(rng, 3, 4), -9, 9)
      const answer = Math.max(...values)
      const set = `\\{ ${values.join(', ')} \\}`
      return {
        tag: 'supremum',
        selfTestAnswer: String(answer),
        item: fillBlankItem(
          `gen-sup-${index}`,
          `Let $A = ${set}$. What is $\\sup A$?`,
          { type: 'expression', engine: 'mathjs', accept: [String(answer)] },
        ),
      }
    },
  },
  {
    id: 'inf-finite-set',
    tags: ['infimum', 'bounds'],
    generate: (rng, index) => {
      const values = distinctInts(rng, randInt(rng, 3, 4), -9, 9)
      const answer = Math.min(...values)
      const set = `\\{ ${values.join(', ')} \\}`
      return {
        tag: 'infimum',
        selfTestAnswer: String(answer),
        item: fillBlankItem(
          `gen-inf-${index}`,
          `Let $A = ${set}$. What is $\\inf A$?`,
          { type: 'expression', engine: 'mathjs', accept: [String(answer)] },
        ),
      }
    },
  },
  {
    id: 'density-between',
    tags: ['density', 'rationals', 'archimedean'],
    generate: (rng, index) => {
      const a = randInt(rng, -8, 6)
      const b = a + randInt(rng, 2, 4)
      return {
        tag: 'density',
        // Midpoint is a known rational strictly between a and b.
        selfTestAnswer: String((a + b) / 2),
        item: fillBlankItem(
          `gen-density-${index}`,
          `Give a rational number strictly between $${a}$ and $${b}$.`,
          { type: 'interval', engine: 'mathjs', accept: [String(a), String(b)] },
        ),
      }
    },
  },
  {
    id: 'archimedean-ceil',
    tags: ['archimedean', 'completeness'],
    generate: (rng, index) => {
      const x = randInt(rng, 1, 20) + 0.5
      const answer = Math.floor(x) + 1
      return {
        tag: 'archimedean',
        selfTestAnswer: String(answer),
        item: fillBlankItem(
          `gen-arch-${index}`,
          `What is the smallest integer $n$ with $n > ${x}$?`,
          { type: 'expression', engine: 'mathjs', accept: [String(answer)] },
        ),
      }
    },
  },
]

function templatesForTag(tag: string): ProblemTemplate[] {
  return TEMPLATES.filter((t) => t.tags.includes(tag))
}

/**
 * Deterministic, authoritative candidates for a concept. Same `seed` reproduces
 * the same items. Returns [] for tags with no template (caller falls back).
 */
export function generateLocalCandidates(
  tag: string,
  count = 3,
  seed = 1,
): GeneratedCandidate[] {
  const templates = templatesForTag(tag)
  if (templates.length === 0) return []
  const rng = mulberry32(seed)
  const out: GeneratedCandidate[] = []
  for (let i = 0; i < count; i += 1) {
    const template = templates[i % templates.length]
    out.push(template.generate(rng, i))
  }
  return out
}

const GENERATION_SYSTEM_PROMPT = [
  'You generate practice problems for a real-analysis course.',
  'Keep the DEEP STRUCTURE (the concept being tested) fixed, but vary the SURFACE (wording, numbers).',
  'Each problem must have a single numeric answer computable by math.js.',
  'Return ONLY a JSON array. Each element: { "prompt": string, "answerExpression": string }.',
  'answerExpression must be a pure math.js expression of numbers/operators (e.g. "max(3,-2,7)") that evaluates to the answer. No prose, no variables.',
  'Do not include the answer in the prompt. Use $...$ for any LaTeX.',
].join('\n')

export type BuildGenerationPromptParams = {
  tag: string
  count?: number
}

export function buildGenerationPrompt({
  tag,
  count = 3,
}: BuildGenerationPromptParams): ChatMessage[] {
  return [
    { role: 'system', content: GENERATION_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Generate ${count} problems for the concept "${tag}". Return only the JSON array.`,
    },
  ]
}

type RawLlmCandidate = { prompt?: unknown; answerExpression?: unknown }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Maps untrusted LLM output into candidates whose answer is INDEPENDENTLY
 * computed by math.js from the proposed expression. Anything that does not parse
 * or does not evaluate to a finite number is dropped here (before verification).
 */
export function parseLlmCandidates(raw: unknown, tag: string): GeneratedCandidate[] {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }
  }

  // Accept either a bare array or an object wrapper (OpenAI json_object mode
  // returns an object, e.g. { "problems": [...] }).
  const list: unknown[] | null = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed)
      ? (Object.values(parsed).find((v) => Array.isArray(v)) as
          | unknown[]
          | undefined) ?? null
      : null
  if (!list) return []

  const out: GeneratedCandidate[] = []
  list.forEach((entry, index) => {
    const { prompt, answerExpression } = (entry ?? {}) as RawLlmCandidate
    if (typeof prompt !== 'string' || prompt.trim() === '') return
    if (typeof answerExpression !== 'string' || answerExpression.trim() === '') {
      return
    }

    let computed: unknown
    try {
      computed = math.evaluate(answerExpression)
    } catch {
      return
    }
    if (typeof computed !== 'number' || !Number.isFinite(computed)) return

    const answer = String(computed)
    out.push({
      tag,
      selfTestAnswer: answer,
      claimedAnswer: answer,
      item: fillBlankItem(`gen-llm-${tag}-${index}`, prompt, {
        type: 'expression',
        engine: 'mathjs',
        accept: [answer],
      }),
    })
  })
  return out
}
