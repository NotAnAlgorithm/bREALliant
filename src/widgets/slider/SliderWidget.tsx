import { useId, type ChangeEvent } from 'react'

import type { WidgetComponentProps } from '../types'
import {
  clampToRange,
  evalReadout,
  formatValue,
  parseSliderProps,
  type SliderState,
} from './utils'

export function SliderWidget({
  widget,
  state,
  onStateChange,
  disabled = false,
}: WidgetComponentProps) {
  const props = parseSliderProps(widget.props)
  const inputId = useId()

  const value =
    typeof state.value === 'number' && Number.isFinite(state.value)
      ? clampToRange(state.value, props.min, props.max)
      : props.initialValue

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value)
    if (!Number.isFinite(next)) return
    onStateChange({ value: clampToRange(next, props.min, props.max) } satisfies SliderState)
  }

  return (
    <div
      className="space-y-3 rounded-xl border border-border bg-surface-elevated px-4 py-4"
      data-widget="slider"
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {props.label ?? 'Value'}
        </label>
        <span className="font-mono text-sm font-medium text-ink">
          {props.label ? `${props.label} = ` : ''}
          {formatValue(value)}
          {props.unit ? ` ${props.unit}` : ''}
        </span>
      </div>

      <input
        id={inputId}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={value}
        disabled={disabled}
        onChange={handleChange}
        aria-label={props.label ?? 'Adjust value'}
        aria-valuetext={formatValue(value)}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-brand disabled:cursor-not-allowed disabled:opacity-50"
      />

      <div className="flex justify-between text-[11px] text-ink-muted">
        <span>{formatValue(props.min)}</span>
        <span>{formatValue(props.max)}</span>
      </div>

      {props.markers.length > 0 ? (
        <ul className="flex flex-wrap gap-2 text-[11px] text-ink-muted">
          {props.markers.map((marker, index) => (
            <li key={index} className="rounded-md border border-border px-2 py-0.5">
              {marker.label ? `${marker.label}: ` : ''}
              {formatValue(marker.value)}
            </li>
          ))}
        </ul>
      ) : null}

      {props.readouts.length > 0 ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {props.readouts.map((readout, index) => (
            <div key={index} className="contents">
              <dt className="font-mono text-ink-muted">{readout.label}</dt>
              <dd className="text-right font-mono font-medium text-ink">
                {evalReadout(readout.expression, value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}
