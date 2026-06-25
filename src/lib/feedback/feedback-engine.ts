import type { Feedback } from '@content/schemas/feedback'
import type { Validator } from '@content/schemas/validators'
import type { WidgetKind } from '@content/schemas/widgets'

import { runValidator } from '../validators/run-validator'
import type { WidgetState } from '../../widgets/types'
import { resolveIncorrectMessage } from './match-pattern'

export type EvaluationResult = {
  correct: boolean
  message: string
}

export function getAnswerFromWidgetState(
  kind: WidgetKind,
  state: WidgetState,
): string {
  switch (kind) {
    case 'fill_blank':
      return String(state.answer ?? '')
    case 'number_line': {
      const fraction = state.markerFraction
      if (typeof fraction === 'string' && fraction.length > 0) return fraction
      return String(state.markerPosition ?? '')
    }
    case 'rational_input': {
      const numStr =
        typeof state.num === 'string' ? state.num.trim() : String(state.num ?? '')
      const denStr =
        typeof state.den === 'string' ? state.den.trim() : String(state.den ?? '')
      if (numStr === '' || denStr === '') return ''
      const num = Number(numStr)
      const den = Number(denStr)
      if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return ''
      return `${num}/${den}`
    }
    case 'fraction_line': {
      const num = Number(state.aNum)
      const den = Number(state.aDen)
      if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return ''
      return `${num}/${den}`
    }
    case 'multiple_choice':
      return String(state.selectedId ?? '')
    case 'drag_order':
      return (Array.isArray(state.order) ? state.order : []).join(',')
    default:
      return ''
  }
}

export function evaluateProblem(
  validator: Validator,
  feedback: Feedback,
  answer: string,
): EvaluationResult {
  const correct = runValidator(validator, answer)

  if (correct) {
    return { correct: true, message: feedback.correct }
  }

  return {
    correct: false,
    message: resolveIncorrectMessage(feedback.incorrect, answer),
  }
}

export function evaluateProblemFromWidget(
  validator: Validator,
  feedback: Feedback,
  kind: WidgetKind,
  state: WidgetState,
): EvaluationResult {
  return evaluateProblem(
    validator,
    feedback,
    getAnswerFromWidgetState(kind, state),
  )
}
