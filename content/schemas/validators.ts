import { z } from 'zod'

export const validatorTypeSchema = z.enum([
  'expression',
  'set_match',
  'interval',
  'custom',
])

export const validatorSchema = z.object({
  type: validatorTypeSchema,
  engine: z.literal('mathjs').default('mathjs'),
  accept: z.array(z.string()).min(1),
  tolerance: z.number().nonnegative().optional(),
})

export type Validator = z.infer<typeof validatorSchema>
