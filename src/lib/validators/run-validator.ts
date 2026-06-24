import { create, all } from 'mathjs'

import type { Validator } from '@content/schemas/validators'

import { normalizeAnswer } from './normalize'

const math = create(all, {})

function parseNumeric(value: string): number | null {
  const normalized = normalizeAnswer(value)
  if (!normalized) return null

  try {
    const result = math.evaluate(normalized)
    if (typeof result === 'number' && Number.isFinite(result)) {
      return result
    }
  } catch {
    // fall through to parseFloat
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function valuesMatch(
  learner: string,
  expected: string,
  tolerance: number,
): boolean {
  if (normalizeAnswer(learner) === normalizeAnswer(expected)) {
    return true
  }

  const a = parseNumeric(learner)
  const b = parseNumeric(expected)
  if (a === null || b === null) return false
  return Math.abs(a - b) <= tolerance
}

export function runValidator(validator: Validator, answer: string): boolean {
  const tolerance = validator.tolerance ?? 0.001

  switch (validator.type) {
    case 'expression':
      return validator.accept.some((expected) =>
        valuesMatch(answer, expected, tolerance),
      )
    case 'set_match':
    case 'interval':
    case 'custom':
      return validator.accept.some(
        (expected) => normalizeAnswer(answer) === normalizeAnswer(expected),
      )
    default: {
      const _exhaustive: never = validator.type
      return _exhaustive
    }
  }
}
