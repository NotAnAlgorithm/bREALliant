import { z } from 'zod'

export const textBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string(),
})

export const mathBlockSchema = z.object({
  type: z.literal('math'),
  latex: z.string(),
})

export const blockSchema = z.discriminatedUnion('type', [
  textBlockSchema,
  mathBlockSchema,
])

export type Block = z.infer<typeof blockSchema>
export type TextBlock = z.infer<typeof textBlockSchema>
export type MathBlock = z.infer<typeof mathBlockSchema>
