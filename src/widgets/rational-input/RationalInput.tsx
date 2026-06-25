import type { ChangeEvent } from 'react'

import type { WidgetComponentProps } from '../types'
import { parseRationalInputProps, type RationalInputState } from './utils'

export function RationalInput({
  widget,
  state,
  onStateChange,
  disabled = false,
}: WidgetComponentProps) {
  const props = parseRationalInputProps(widget.props)
  const num = typeof state.num === 'string' ? state.num : ''
  const den = typeof state.den === 'string' ? state.den : ''

  const update =
    (key: 'num' | 'den') => (event: ChangeEvent<HTMLInputElement>) => {
      const next: RationalInputState = { num, den, [key]: event.target.value }
      onStateChange(next)
    }

  const numValue = Number(num)
  const denValue = Number(den)
  const preview =
    num.trim() !== '' &&
    den.trim() !== '' &&
    Number.isFinite(numValue) &&
    Number.isFinite(denValue) &&
    denValue !== 0
      ? numValue / denValue
      : null

  const inputClass =
    'min-h-11 w-16 rounded-md border border-border bg-surface px-3 py-2 text-center font-mono text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50'

  return (
    <div
      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-4"
      data-widget="rational_input"
    >
      {props.label ? (
        <span className="text-xs font-medium text-ink-muted">
          {props.label}
        </span>
      ) : null}

      <div className="flex flex-col items-center">
        <input
          type="text"
          inputMode="numeric"
          value={num}
          disabled={disabled}
          placeholder={props.placeholderNum}
          aria-label="numerator"
          onChange={update('num')}
          className={inputClass}
        />
        <span className="my-1 h-px w-14 bg-ink/60" aria-hidden />
        <input
          type="text"
          inputMode="numeric"
          value={den}
          disabled={disabled}
          placeholder={props.placeholderDen}
          aria-label="denominator"
          onChange={update('den')}
          className={inputClass}
        />
      </div>

      {preview !== null ? (
        <span className="text-sm text-ink-muted">
          = {Number(preview.toFixed(4))}
        </span>
      ) : null}
    </div>
  )
}
