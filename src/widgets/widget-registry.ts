import type { WidgetKind } from '@content/schemas/widgets'

import { FillBlankWidget } from './fill-blank/FillBlankWidget'
import { NumberLineWidget } from './number-line/NumberLineWidget'
import type { WidgetComponent } from './types'

export const widgetRegistry: Partial<Record<WidgetKind, WidgetComponent>> = {
  number_line: NumberLineWidget,
  fill_blank: FillBlankWidget,
}

export function isWidgetImplemented(kind: WidgetKind): boolean {
  return kind in widgetRegistry
}
