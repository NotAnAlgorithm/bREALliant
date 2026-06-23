import { z } from 'zod'

export const incorrectFeedbackSchema = z.object({
  match: z.string(),
  message: z.string(),
})

export const feedbackSchema = z.object({
  correct: z.string(),
  incorrect: z.array(incorrectFeedbackSchema).min(1),
})

export type Feedback = z.infer<typeof feedbackSchema>
export type IncorrectFeedback = z.infer<typeof incorrectFeedbackSchema>
