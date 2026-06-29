// Display-order shuffling for choice-style widgets.
//
// Authored choices always render in the same order, which lets learners memorise
// "the answer is the second one" and telegraphs structure. Scrambling the
// DISPLAY order each time defeats that — and is safe because grading is by choice
// id, never position.
//
// Two guards keep it from breaking meaning:
//   • an explicit `props.shuffle === false` opt-out, and
//   • a heuristic that preserves order when any label references position or
//     aggregates the other options (e.g. "all of the above").

export type LabeledOption = { id: string; label: string }

// Substrings that signal a label depends on the order/identity of other options.
const POSITIONAL_HINTS: readonly string[] = [
  'above',
  'below',
  'of the following',
  'of these',
  'of the options',
]

function referencesPosition(options: ReadonlyArray<LabeledOption>): boolean {
  return options.some((option) => {
    const label = option.label.toLowerCase()
    return POSITIONAL_HINTS.some((hint) => label.includes(hint))
  })
}

/**
 * Returns the options in a shuffled display order. Pure given `rng` (defaults to
 * Math.random); returns the original array unchanged when shuffling is disabled,
 * there are fewer than two options, or a label looks position-dependent.
 */
export function orderOptionsForDisplay<T extends LabeledOption>(
  options: T[],
  props: Record<string, unknown> = {},
  rng: () => number = Math.random,
): T[] {
  if (options.length < 2) return options
  if (props.shuffle === false) return options
  if (referencesPosition(options)) return options

  const out = [...options]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}
