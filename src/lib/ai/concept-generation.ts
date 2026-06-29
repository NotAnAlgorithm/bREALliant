// Stage 6 (beta) — Conceptual problem generation.
//
// The numeric F8 path (problem-templates.ts) produced single-answer plug-and-chug
// items. Stage 6 instead proposes CONCEPTUAL items aligned with the curated
// practice bank: choice-style widgets (multiple_choice / multiple_select /
// spot_the_flaw) graded by `set_match`, on the 1-3 difficulty scale, with concise
// Socratic feedback.
//
// Trust model (unchanged, verifier-first):
//   • The LLM only PROPOSES. It never decides correctness and is never trusted to
//     emit a valid item.
//   • Every proposal is structurally gated here (mirrors the curated-bank
//     integrity invariants) and canonically re-encoded, then must still pass the
//     shared `verifyCandidate` self-test before it can be served.
//   • These items are a sandboxed beta surface and DO NOT feed the mastery signal.
//
// Widget scope is deliberately narrow: only the three fully self-contained
// choice widgets, whose answers we can structurally verify without trusting the
// model's encoding. justify_step / drag_order (richer, order-sensitive) stay
// curated-only for now.

import type { QuizItem } from '@content/schemas'
import type { ChatMessage } from './types'
import type { GeneratedCandidate } from './verify-generated'

export const CONCEPT_WIDGET_KINDS = [
  'multiple_choice',
  'multiple_select',
  'spot_the_flaw',
] as const

export type ConceptWidgetKind = (typeof CONCEPT_WIDGET_KINDS)[number]

const CONCEPT_WIDGET_SET: ReadonlySet<string> = new Set(CONCEPT_WIDGET_KINDS)

// --- Prompt -------------------------------------------------------------------

const CONCEPT_SYSTEM_PROMPT = [
  'You are a real-analysis (Rudin-style) assessment author generating CONCEPTUAL practice problems.',
  'Goal: probe understanding of definitions, logical status, justification, counterexamples, and connections between ideas — NOT numeric calculation or plug-and-chug.',
  '',
  'Return ONLY a JSON object: { "items": [ <item>, ... ] }. No prose, no markdown fences.',
  '',
  'Each <item> has exactly this shape:',
  '{',
  '  "prompt": string,                       // concept-first question; use $...$ for LaTeX; escape backslashes',
  '  "difficulty": 1 | 2 | 3,                // 1 meaning/logical status, 2 justify/counterexample, 3 synthesis across concepts',
  '  "widget": "multiple_choice" | "multiple_select" | "spot_the_flaw",',
  '  "choices": [ { "id": "a", "label": string }, ... ],   // for multiple_choice / multiple_select (4-5 options, strong distractors)',
  '  "steps":   [ { "id": "p1", "label": string }, ... ],  // for spot_the_flaw ONLY (>=2 proof steps, EXACTLY ONE invalid)',
  '  "correct": string | string[],          // choice id (mc), array of ids (ms, state the count in the prompt), or the flawed step id',
  '  "feedback": {',
  '    "correct": string,                    // 1-2 sentence summary that reinforces the idea',
  '    "incorrect": [ { "match": "*", "message": string } ]   // SHORT + Socratic; the "*" catch-all is required',
  '  }',
  '}',
  '',
  'Rules:',
  '- Every claim must be TRUE and the item well-posed; the correct answer must be unambiguous and the distractors tempting but wrong.',
  '- Encode genuine misconceptions (e.g. a set can be neither open nor closed; bounded does not imply convergent; continuity does not imply uniform continuity).',
  '- Do NOT reveal which option is correct inside the prompt.',
  '- ids must be short and unique within an item (a,b,c,... or p1,p2,...).',
  '- Keep feedback.incorrect to a single { "match": "*", ... } catch-all unless a specific distractor truly needs its own nudge.',
  '- Prefer variety across the requested concepts and widget kinds.',
].join('\n')

// One compact exemplar anchors the style/format without burning the token budget.
const CONCEPT_FEWSHOT = JSON.stringify({
  items: [
    {
      prompt:
        'Which statement about a compact subset $K\\subseteq\\mathbb{R}$ is **true**?',
      difficulty: 1,
      widget: 'multiple_choice',
      choices: [
        { id: 'a', label: '$K$ is closed and bounded.' },
        { id: 'b', label: '$K$ must be an interval.' },
        { id: 'c', label: '$K$ is open.' },
        { id: 'd', label: '$K$ has a largest element only if it is infinite.' },
      ],
      correct: 'a',
      feedback: {
        correct:
          'Yes — in $\\mathbb{R}$, Heine–Borel makes compact equivalent to closed and bounded.',
        incorrect: [
          {
            match: '*',
            message:
              'Which pair of properties does Heine–Borel tie to compactness in $\\mathbb{R}$?',
          },
        ],
      },
    },
  ],
})

/** How many existing prompts to show the model, and how much of each. */
const MAX_AVOID_PROMPTS = 14
const AVOID_PROMPT_CHARS = 180

export type BuildConceptPromptParams = {
  tags: string[]
  count?: number
  /** Optional human-readable mastery hint to steer the difficulty mix. */
  masteryHint?: string
  /** Existing prompts the model must NOT reproduce or lightly reword. */
  avoidPrompts?: string[]
}

export function buildConceptGenerationPrompt({
  tags,
  count = 3,
  masteryHint,
  avoidPrompts = [],
}: BuildConceptPromptParams): ChatMessage[] {
  const concepts = tags.length > 0 ? tags.join(', ') : 'real analysis'
  const lines = [
    `Generate ${count} conceptual problems drilling these concepts: ${concepts}.`,
    'Spread them across difficulty 1-3 and vary the widget kinds.',
  ]
  if (masteryHint) lines.push(`Learner context: ${masteryHint}.`)

  if (avoidPrompts.length > 0) {
    const shown = avoidPrompts
      .slice(0, MAX_AVOID_PROMPTS)
      .map((p) => `- ${p.slice(0, AVOID_PROMPT_CHARS)}`)
      .join('\n')
    lines.push(
      '',
      'These problems ALREADY EXIST in the bank. Do NOT reproduce or lightly reword any of them — write genuinely different questions (new framing, different misconception, or a different sub-idea):',
      shown,
    )
  }

  lines.push('', `Format example (follow this shape exactly):`, CONCEPT_FEWSHOT)
  return [
    { role: 'system', content: CONCEPT_SYSTEM_PROMPT },
    { role: 'user', content: lines.join('\n') },
  ]
}

// --- Near-duplicate detection -------------------------------------------------

/** Normalise a prompt to a bag of content words (LaTeX/punctuation stripped). */
function promptTokens(prompt: string): Set<string> {
  const words = prompt
    .toLowerCase()
    .replace(/\$[^$]*\$/g, ' ') // drop inline math spans
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
  return new Set(words)
}

/**
 * Overlap score between two token sets. Combines Jaccard with containment
 * (overlap relative to the smaller set) so a reworded prompt that merely pads an
 * existing one with extra words is still recognised as a duplicate. Containment
 * is only trusted once the smaller prompt is non-trivial, to avoid flagging two
 * unrelated very-short prompts that happen to share their few words.
 */
function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let inter = 0
  for (const w of a) if (b.has(w)) inter += 1
  const union = a.size + b.size - inter
  const jaccard = union === 0 ? 0 : inter / union
  const minSize = Math.min(a.size, b.size)
  const containment = minSize === 0 ? 0 : inter / minSize
  return minSize >= 4 ? Math.max(jaccard, containment) : jaccard
}

/** Two prompts count as duplicates when their content-word overlap is high. */
const DUPLICATE_THRESHOLD = 0.8

function isNearDuplicate(prompt: string, against: Array<Set<string>>): boolean {
  const tokens = promptTokens(prompt)
  return against.some((other) => similarity(tokens, other) >= DUPLICATE_THRESHOLD)
}

// --- Parsing + structural gate ------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

type RawOption = { id: string; label: string }

/** Extract a clean, unique-id option list, or null if structurally invalid. */
function parseOptions(value: unknown, min: number): RawOption[] | null {
  if (!Array.isArray(value) || value.length < min) return null
  const out: RawOption[] = []
  const ids = new Set<string>()
  for (const entry of value) {
    if (!isRecord(entry)) return null
    const { id, label } = entry
    if (typeof id !== 'string' || id.trim() === '') return null
    if (typeof label !== 'string' || label.trim() === '') return null
    if (ids.has(id)) return null
    ids.add(id)
    out.push({ id, label })
  }
  return out
}

/** Normalise the LLM `correct` field to a list of ids. */
function correctIds(value: unknown): string[] | null {
  if (typeof value === 'string') {
    const ids = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    return ids.length > 0 ? ids : null
  }
  if (Array.isArray(value)) {
    const ids = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    return ids.length === value.length && ids.length > 0 ? ids : null
  }
  return null
}

/** Build feedback with a guaranteed trailing `*` catch-all (integrity invariant). */
function normaliseFeedback(value: unknown): QuizItem['feedback'] | null {
  if (!isRecord(value)) return null
  const correct = value.correct
  if (typeof correct !== 'string' || correct.trim() === '') return null

  const rawIncorrect = Array.isArray(value.incorrect) ? value.incorrect : []
  const entries: Array<{ match: string; message: string }> = []
  for (const entry of rawIncorrect) {
    if (!isRecord(entry)) continue
    const { match, message } = entry
    if (typeof match !== 'string' || typeof message !== 'string') continue
    if (message.trim() === '') continue
    entries.push({ match, message })
  }

  const nonStar = entries.filter((e) => e.match !== '*')
  const star = entries.find((e) => e.match === '*')
  const catchAll = star ?? {
    match: '*',
    message: 'Revisit the relevant definition or theorem, then reconsider each option.',
  }
  return { correct, incorrect: [...nonStar, catchAll] }
}

/**
 * Map one untrusted LLM item into a verifiable GeneratedCandidate, or null if it
 * fails any structural invariant. The validator is always `set_match` with a
 * single canonical accept string, and `selfTestAnswer` equals it so the shared
 * verifier can prove the served item is gradeable.
 */
export function buildConceptCandidate(raw: unknown, tag: string): GeneratedCandidate | null {
  if (!isRecord(raw)) return null

  const prompt = raw.prompt
  if (typeof prompt !== 'string' || prompt.trim() === '') return null

  const kind = raw.widget
  if (typeof kind !== 'string' || !CONCEPT_WIDGET_SET.has(kind)) return null

  const difficulty =
    raw.difficulty === 1 || raw.difficulty === 2 || raw.difficulty === 3
      ? raw.difficulty
      : 1

  const feedback = normaliseFeedback(raw.feedback)
  if (!feedback) return null

  const selected = correctIds(raw.correct)
  if (!selected) return null

  let props: Record<string, unknown>
  let optionIds: Set<string>
  let accept: string

  if (kind === 'spot_the_flaw') {
    const steps = parseOptions(raw.steps, 2)
    if (!steps) return null
    optionIds = new Set(steps.map((s) => s.id))
    if (selected.length !== 1 || !optionIds.has(selected[0])) return null
    props = { steps }
    accept = selected[0]
  } else {
    // multiple_choice / multiple_select
    const choices = parseOptions(raw.choices, 2)
    if (!choices) return null
    optionIds = new Set(choices.map((c) => c.id))
    props = { choices }
    if (kind === 'multiple_choice') {
      if (selected.length !== 1 || !optionIds.has(selected[0])) return null
      accept = selected[0]
    } else {
      // multiple_select: every id offered, deduped, canonically sorted+joined.
      const unique = [...new Set(selected)]
      if (unique.length !== selected.length) return null
      if (!unique.every((id) => optionIds.has(id))) return null
      accept = [...unique].sort().join(',')
    }
  }

  const item: QuizItem = {
    id: `gen-concept-${tag}-${Math.random().toString(36).slice(2, 8)}`,
    prompt,
    widget: { kind: kind as ConceptWidgetKind, props },
    validator: { type: 'set_match', engine: 'mathjs', accept: [accept] },
    feedback,
    difficulty,
  }

  return { tag, selfTestAnswer: accept, item }
}

/**
 * Parse untrusted edge-function output into structurally valid candidates. Robust
 * to a bare array, a `{ items: [...] }` wrapper, an object whose first array value
 * is the list, or a JSON string (optionally fenced). Anything malformed is
 * silently dropped.
 */
export function parseConceptCandidates(
  raw: unknown,
  tags: string[],
  avoidPrompts: string[] = [],
): GeneratedCandidate[] {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    const stripped = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
    try {
      parsed = JSON.parse(stripped)
    } catch {
      return []
    }
  }

  let list: unknown[] | null = null
  if (Array.isArray(parsed)) {
    list = parsed
  } else if (isRecord(parsed)) {
    if (Array.isArray(parsed.items)) {
      list = parsed.items
    } else {
      const firstArray = Object.values(parsed).find((v) => Array.isArray(v))
      list = (firstArray as unknown[] | undefined) ?? null
    }
  }
  if (!list) return []

  const tag = tags[0] ?? 'concept'
  const tagSet = new Set(tags)
  // Seed the seen-set with existing bank prompts so generated items can't merely
  // restate them; grow it as we accept items so the batch is internally distinct.
  const seen = avoidPrompts.map(promptTokens)

  const out: GeneratedCandidate[] = []
  for (const entry of list) {
    const declared = isRecord(entry) && typeof entry.tag === 'string' ? entry.tag : undefined
    const itemTag = declared && tagSet.has(declared) ? declared : tag
    const candidate = buildConceptCandidate(entry, itemTag)
    if (!candidate) continue
    if (isNearDuplicate(candidate.item.prompt, seen)) continue
    seen.push(promptTokens(candidate.item.prompt))
    out.push(candidate)
  }
  return out
}
