import type { ChangeEvent } from 'react'

import type { WidgetComponentProps } from '../types'
import { clamp, valueToX } from '../number-line/utils'
import {
  fractionValue,
  parseFractionLineProps,
  type FractionLineState,
} from './utils'

const SVG_WIDTH = 320
const SVG_HEIGHT = 96
const PADDING = 24
const AXIS_Y = 52

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

type FractionInputProps = {
  label: string
  num: number
  den: number
  colorClass: string
  disabled: boolean
  onChange: (next: { num: number; den: number }) => void
}

function FractionInput({
  label,
  num,
  den,
  colorClass,
  disabled,
  onChange,
}: FractionInputProps) {
  const handle =
    (key: 'num' | 'den') => (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number.parseInt(event.target.value, 10)
      const value = Number.isFinite(parsed) ? parsed : 0
      onChange({ num, den, [key]: value })
    }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-xs font-medium ${colorClass}`}>{label}</span>
      <div className="flex flex-col items-center">
        <input
          type="number"
          inputMode="numeric"
          value={Number.isFinite(num) ? num : ''}
          disabled={disabled}
          aria-label={`${label} numerator`}
          onChange={handle('num')}
          className="h-9 w-14 rounded-md border border-border bg-surface text-center font-mono text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
        />
        <span className="my-0.5 h-px w-12 bg-ink/60" aria-hidden />
        <input
          type="number"
          inputMode="numeric"
          value={Number.isFinite(den) ? den : ''}
          disabled={disabled}
          aria-label={`${label} denominator`}
          onChange={handle('den')}
          className="h-9 w-14 rounded-md border border-border bg-surface text-center font-mono text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
        />
      </div>
    </div>
  )
}

function PlottedPoint({
  value,
  min,
  max,
  colorClass,
  label,
}: {
  value: number | null
  min: number
  max: number
  colorClass: string
  label: string
}) {
  if (value === null || value < min || value > max) return null
  const x = valueToX(value, min, max, SVG_WIDTH, PADDING)
  return (
    <g>
      <circle cx={x} cy={AXIS_Y} r={7} className={colorClass} />
      <text
        x={x}
        y={AXIS_Y - 14}
        textAnchor="middle"
        className="fill-ink text-[11px] font-medium"
      >
        {label}
      </text>
    </g>
  )
}

export function FractionLineWidget({
  widget,
  state,
  onStateChange,
  disabled = false,
}: WidgetComponentProps) {
  const props = parseFractionLineProps(widget.props)
  const { min, max, inputs, showMidpoint, transform, target, bands } = props

  const aNum = toNumber(state.aNum, props.defaultA[0])
  const aDen = toNumber(state.aDen, props.defaultA[1])
  const bNum = toNumber(state.bNum, props.defaultB[0])
  const bDen = toNumber(state.bDen, props.defaultB[1])

  const aValue = fractionValue(aNum, aDen)
  const bValue = fractionValue(bNum, bDen)

  const update = (next: Partial<FractionLineState>) => {
    if (disabled) return
    const base: FractionLineState =
      inputs === 2 ? { aNum, aDen, bNum, bDen } : { aNum, aDen }
    onStateChange({ ...base, ...next })
  }

  const midpoint =
    showMidpoint && aValue !== null && bValue !== null
      ? (aValue + bValue) / 2
      : null

  const squared = transform === 'square' && aValue !== null ? aValue * aValue : null

  const targetX =
    target !== null ? valueToX(clamp(target, min, max), min, max, SVG_WIDTH, PADDING) : null

  return (
    <div className="space-y-4" data-widget="fraction_line">
      <div className="flex items-end justify-center gap-6">
        <FractionInput
          label={inputs === 2 ? 'a' : 'p'}
          num={aNum}
          den={aDen}
          colorClass="text-brand"
          disabled={disabled}
          onChange={({ num, den }) => update({ aNum: num, aDen: den })}
        />
        {inputs === 2 ? (
          <FractionInput
            label="b"
            num={bNum}
            den={bDen}
            colorClass="text-amber-600"
            disabled={disabled}
            onChange={({ num, den }) => update({ bNum: num, bDen: den })}
          />
        ) : null}
      </div>

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full select-none"
        role="img"
        aria-label={`Number line from ${min} to ${max}`}
      >
        {target !== null && targetX !== null
          ? bands.map((band, index) => {
              const x1 = band.side === 'below' ? PADDING : targetX
              const x2 = band.side === 'below' ? targetX : SVG_WIDTH - PADDING
              const left = Math.min(x1, x2)
              const width = Math.abs(x2 - x1)
              return (
                <g key={index}>
                  <rect
                    x={left}
                    y={AXIS_Y - 10}
                    width={width}
                    height={20}
                    className={
                      band.side === 'below'
                        ? 'fill-brand/10'
                        : 'fill-amber-500/10'
                    }
                  />
                  {band.label ? (
                    <text
                      x={left + width / 2}
                      y={14}
                      textAnchor="middle"
                      className={`text-[10px] font-medium ${
                        band.side === 'below' ? 'fill-brand' : 'fill-amber-600'
                      }`}
                    >
                      {band.label}
                    </text>
                  ) : null}
                </g>
              )
            })
          : null}

        <line
          x1={PADDING}
          y1={AXIS_Y}
          x2={SVG_WIDTH - PADDING}
          y2={AXIS_Y}
          className="stroke-ink/30"
          strokeWidth={2}
        />
        <text
          x={PADDING}
          y={AXIS_Y + 22}
          textAnchor="middle"
          className="fill-ink-muted text-[11px]"
        >
          {min}
        </text>
        <text
          x={SVG_WIDTH - PADDING}
          y={AXIS_Y + 22}
          textAnchor="middle"
          className="fill-ink-muted text-[11px]"
        >
          {max}
        </text>

        {targetX !== null ? (
          <g>
            <line
              x1={targetX}
              y1={AXIS_Y - 18}
              x2={targetX}
              y2={AXIS_Y + 14}
              className="stroke-ink-muted/60"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text
              x={targetX}
              y={AXIS_Y + 22}
              textAnchor="middle"
              className="fill-ink-muted text-[11px]"
            >
              {target}
            </text>
          </g>
        ) : null}

        {midpoint !== null ? (
          <PlottedPoint
            value={midpoint}
            min={min}
            max={max}
            colorClass="fill-emerald-500"
            label="mid"
          />
        ) : null}

        <PlottedPoint
          value={aValue}
          min={min}
          max={max}
          colorClass="fill-brand"
          label={inputs === 2 ? 'a' : 'p'}
        />
        {inputs === 2 ? (
          <PlottedPoint
            value={bValue}
            min={min}
            max={max}
            colorClass="fill-amber-500"
            label="b"
          />
        ) : null}
      </svg>

      <div className="space-y-1 text-center text-sm">
        {aValue === null ? (
          <p className="text-ink-muted">
            Enter a denominator that isn&apos;t zero.
          </p>
        ) : (
          <p className="font-mono text-ink">
            {inputs === 2 ? 'a' : 'p'} = {aNum}/{aDen} = {aValue.toFixed(4)}
          </p>
        )}

        {inputs === 2 && bValue !== null ? (
          <p className="font-mono text-ink">
            b = {bNum}/{bDen} = {bValue.toFixed(4)}
          </p>
        ) : null}

        {midpoint !== null ? (
          <p className="font-medium text-emerald-700">
            midpoint = (a + b) / 2 ={' '}
            <span className="font-mono">
              ({aNum}/{aDen} + {bNum}/{bDen}) / 2 = {midpoint.toFixed(4)}
            </span>{' '}
            — a rational between a and b
          </p>
        ) : null}

        {squared !== null && target !== null ? (
          <p
            className={
              Math.abs(squared - target) < 1e-9
                ? 'font-medium text-emerald-700'
                : squared < target
                  ? 'font-medium text-brand'
                  : 'font-medium text-amber-600'
            }
          >
            <span className="font-mono">
              p² = {squared.toFixed(4)}
            </span>{' '}
            {Math.abs(squared - target) < 1e-9
              ? `= ${target}`
              : squared < target
                ? `< ${target}`
                : `> ${target}`}
          </p>
        ) : null}
      </div>
    </div>
  )
}
