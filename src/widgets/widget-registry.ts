import type { WidgetKind } from '@content/schemas/widgets'

import { DragOrderWidget } from './drag-order/DragOrderWidget'
import { FillBlankWidget } from './fill-blank/FillBlankWidget'
import { FractionLineWidget } from './fraction-line/FractionLineWidget'
import { MultipleChoiceWidget } from './multiple-choice/MultipleChoiceWidget'
import { MultipleSelectWidget } from './multiple-select/MultipleSelectWidget'
import { JustifyStep } from './JustifyStep'
import { NumberLineWidget } from './number-line/NumberLineWidget'
import { RationalInput } from './rational-input/RationalInput'
import { SliderWidget } from './slider/SliderWidget'
import { SpotTheFlaw } from './SpotTheFlaw'
import type { WidgetComponent } from './types'

export const widgetRegistry: Partial<Record<WidgetKind, WidgetComponent>> = {
  number_line: NumberLineWidget,
  fraction_line: FractionLineWidget,
  slider: SliderWidget,
  fill_blank: FillBlankWidget,
  rational_input: RationalInput,
  multiple_choice: MultipleChoiceWidget,
  multiple_select: MultipleSelectWidget,
  drag_order: DragOrderWidget,
  spot_the_flaw: SpotTheFlaw,
  justify_step: JustifyStep,
}

export function isWidgetImplemented(kind: WidgetKind): boolean {
  return kind in widgetRegistry
}
