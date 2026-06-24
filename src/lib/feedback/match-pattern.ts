import type { IncorrectFeedback } from '@content/schemas/feedback'

import { normalizeAnswer } from '../validators/normalize'

export function matchPattern(pattern: string, answer: string): boolean {
  if (pattern === '*') return true
  return normalizeAnswer(pattern) === normalizeAnswer(answer)
}

export function resolveIncorrectMessage(
  incorrect: IncorrectFeedback[],
  answer: string,
): string {
  for (const item of incorrect) {
    if (matchPattern(item.match, answer)) {
      return item.message
    }
  }
  return incorrect.at(-1)?.message ?? 'Try again.'
}
