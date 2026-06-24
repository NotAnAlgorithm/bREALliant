import type { WidgetKind } from '@content/schemas/widgets'

import { DragOrderWidget } from './drag-order/DragOrderWidget'
import { FillBlankWidget } from './fill-blank/FillBlankWidget'
import { FractionLineWidget } from './fraction-line/FractionLineWidget'
import { MultipleChoiceWidget } from './multiple-choice/MultipleChoiceWidget'
import { NumberLineWidget } from './number-line/NumberLineWidget'
import type { WidgetComponent } from './types'

export const widgetRegistry: Partial<Record<WidgetKind, WidgetComponent>> = {
  number_line: NumberLineWidget,
  fraction_line: FractionLineWidget,
  fill_blank: FillBlankWidget,
  multiple_choice: MultipleChoiceWidget,
  drag_order: DragOrderWidget,
}

export function isWidgetImplemented(kind: WidgetKind): boolean {
  return kind in widgetRegistry
}
