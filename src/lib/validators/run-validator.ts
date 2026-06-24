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
    case 'interval': {
      // accept = [lower, upper] → answer must lie strictly between the bounds.
      // Falls back to exact match if fewer than two bounds are provided.
      if (validator.accept.length < 2) {
        return validator.accept.some(
          (expected) => normalizeAnswer(answer) === normalizeAnswer(expected),
        )
      }
      const value = parseNumeric(answer)
      const a = parseNumeric(validator.accept[0])
      const b = parseNumeric(validator.accept[1])
      if (value === null || a === null || b === null) return false
      const lower = Math.min(a, b)
      const upper = Math.max(a, b)
      return value > lower && value < upper
    }
    case 'set_match':
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
