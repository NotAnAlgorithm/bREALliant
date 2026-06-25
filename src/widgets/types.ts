import type { ReactNode } from 'react'

import type { Widget } from '@content/schemas/widgets'

export type WidgetState = Record<string, unknown>

export type WidgetComponentProps = {
  widget: Widget
  state: WidgetState
  onStateChange: (state: WidgetState) => void
  disabled?: boolean
}

export type WidgetComponent = (props: WidgetComponentProps) => ReactNode

export function getInitialWidgetState(
  widget: Widget,
  existing?: WidgetState,
): WidgetState {
  if (existing && Object.keys(existing).length > 0) {
    return existing
  }

  switch (widget.kind) {
    case 'number_line': {
      const props = widget.props as {
        min?: number
        max?: number
        initialMarker?: number
      }
      const min = props.min ?? 0
      const max = props.max ?? 10
      const initial = props.initialMarker ?? (min + max) / 2
      return { markerPosition: initial }
    }
    case 'fraction_line': {
      const props = widget.props as {
        inputs?: number
        defaultA?: [number, number]
        defaultB?: [number, number]
      }
      const inputs = props.inputs === 2 ? 2 : 1
      const [aNum, aDen] = props.defaultA ?? (inputs === 2 ? [1, 3] : [1, 2])
      if (inputs === 2) {
        const [bNum, bDen] = props.defaultB ?? [1, 2]
        return { aNum, aDen, bNum, bDen }
      }
      return { aNum, aDen }
    }
    case 'fill_blank':
      return { answer: '' }
    case 'rational_input': {
      const props = widget.props as { default?: [number, number] }
      if (Array.isArray(props.default) && props.default.length === 2) {
        return {
          num: String(props.default[0]),
          den: String(props.default[1]),
        }
      }
      return { num: '', den: '' }
    }
    case 'multiple_choice':
      return { selectedId: '' }
    case 'drag_order': {
      const props = widget.props as {
        items?: Array<{ id?: unknown }>
      }
      const items = Array.isArray(props.items) ? props.items : []
      const order = items.flatMap((item) =>
        item && typeof item.id === 'string' ? [item.id] : [],
      )
      return { order }
    }
    default:
      return {}
  }
}
