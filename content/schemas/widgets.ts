import { z } from 'zod'

export const widgetKindSchema = z.enum([
  'number_line',
  'fraction_line',
  'slider',
  'fill_blank',
  'rational_input',
  'drag_order',
  'multiple_choice',
  'multiple_select',
  'spot_the_flaw',
  'justify_step',
])

export const widgetSchema = z.object({
  kind: widgetKindSchema,
  props: z.record(z.string(), z.unknown()).default({}),
})

export type WidgetKind = z.infer<typeof widgetKindSchema>
export type Widget = z.infer<typeof widgetSchema>
