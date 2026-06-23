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
    case 'fill_blank':
      return { answer: '' }
    default:
      return {}
  }
}
