// F8.2 — Verifier gate (pure). The keystone of "never a wrong answer".
//
// Every generated problem item — whether produced by the deterministic template
// engine or proposed by the LLM — MUST pass through verifyCandidate before it is
// ever shown to a learner. Verification reuses the EXACT same `runValidator`
// the learner will be graded against, so a served item is provably gradeable:
// its declared validator accepts a known-correct answer. Anything that cannot be
// proven correct is dropped.

import type { QuizItem } from '@content/schemas'
import type { Validator } from '@content/schemas/validators'
import type { WidgetKind } from '@content/schemas/widgets'

import { runValidator } from '../validators/run-validator'

// --- Widget ↔ validator compatibility ------------------------------------
//
// A served item is only gradeable if its INPUT widget can actually produce the
// kind of answer its validator grades. The self-test check proves the validator
// accepts a correct string, but it cannot catch a structural mismatch such as a
// numeric `expression` validator wired to a multiple-choice widget: the learner
// would be shown choices yet graded as if they typed a number. We reject those.

/**
 * Numeric validators expect a single numeric/expression answer (graded with
 * math.js + tolerance, or interval membership).
 */
const NUMERIC_VALIDATOR_TYPES: ReadonlySet<Validator['type']> = new Set([
  'expression',
  'interval',
])

/**
 * Widgets that collect a free-form numeric/expression answer — the only widgets
 * compatible with a numeric validator. Every other widget kind is "choice-style"
 * (multiple_choice, spot_the_flaw, justify_step, drag_order) or a positional
 * control (slider, number_line, fraction_line) and must be graded by `set_match`
 * (or `custom`), never by a numeric validator.
 */
const NUMERIC_INPUT_WIDGETS: ReadonlySet<WidgetKind> = new Set([
  'fill_blank',
  'rational_input',
])

function isNumericValidator(validator: Validator): boolean {
  return NUMERIC_VALIDATOR_TYPES.has(validator.type)
}

function isNumericInputWidget(kind: WidgetKind): boolean {
  return NUMERIC_INPUT_WIDGETS.has(kind)
}

// --- Yes/No-in-a-numeric-box heuristic -----------------------------------
//
// A numeric input box can only collect a number, so a yes/no or true/false
// prompt graded by a numeric validator is ill-posed (the learner has no way to
// type "yes"). We detect such prompts with a deliberately NARROW, conservative
// matcher to avoid false positives: a genuinely numeric question that merely
// opens with an interrogative — e.g. "What is sup A?" or "How many limit
// points…?" — must still pass.
//
// Triggers (matched case-insensitively against the prompt with surrounding
// LaTeX/markdown stripped):
//   • starts with a yes/no interrogative stem: "is ", "are ", "does ", "do ",
//     "can ", "is it "
//   • contains an explicit true/false framing: "true or false", "t/f"
//   • ends with a "(yes/no)" / "yes or no" framing
const YESNO_PREFIXES: readonly string[] = [
  'is it ',
  'is ',
  'are ',
  'does ',
  'do ',
  'can ',
]

const YESNO_PHRASES: readonly string[] = [
  'true or false',
  't/f',
  'yes or no',
  'yes/no',
]

/**
 * Returns true when `prompt` reads as a yes/no or true/false question. Pure and
 * conservative: it normalises the prompt to lowercase plain text (stripping `$`
 * math delimiters and collapsing whitespace) and only fires on the explicit
 * stems/phrases above.
 */
function isYesNoPrompt(prompt: string): boolean {
  const text = prompt
    .toLowerCase()
    .replace(/\$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text === '') return false

  // Explicit true/false or yes/no framing anywhere in the prompt.
  if (YESNO_PHRASES.some((phrase) => text.includes(phrase))) return true

  // Yes/no interrogative stem at the start (after any leading enumerator/quote
  // such as "1." or a quotation mark).
  const head = text.replace(/^[\d."'(\s)]+/, '')
  if (YESNO_PREFIXES.some((prefix) => head.startsWith(prefix))) return true

  return false
}

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

  const widgetKind = item.widget.kind
  const numericValidator = isNumericValidator(item.validator)

  // Structural gate 1 — widget ↔ validator compatibility. A numeric validator
  // (expression/interval) grades a typed number, so it MUST be paired with a
  // numeric-input widget (fill_blank/rational_input). Attached to any choice- or
  // control-style widget the item is ill-posed (e.g. an MCQ graded numerically),
  // so we drop it. Non-numeric validators (set_match/custom) are not constrained
  // here: e.g. a set_match validator on a fill_blank is perfectly fine.
  if (numericValidator && !isNumericInputWidget(widgetKind)) return null

  // Structural gate 2 — yes/no-in-a-numeric-box. A numeric input box cannot
  // collect "yes"/"no", so a numeric validator on a numeric-input widget whose
  // prompt is phrased as a yes/no or true/false question is ungradeable. Genuine
  // numeric questions ("What is sup A?") are unaffected by the narrow heuristic.
  if (numericValidator && isNumericInputWidget(widgetKind) && isYesNoPrompt(item.prompt)) {
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
