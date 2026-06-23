import { z } from 'zod'

export const widgetKindSchema = z.enum([
  'number_line',
  'slider',
  'fill_blank',
  'drag_order',
  'multiple_choice',
])

export const widgetSchema = z.object({
  kind: widgetKindSchema,
  props: z.record(z.string(), z.unknown()).default({}),
})

export type WidgetKind = z.infer<typeof widgetKindSchema>
export type Widget = z.infer<typeof widgetSchema>
