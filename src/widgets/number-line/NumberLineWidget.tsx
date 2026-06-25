import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import type { WidgetComponentProps } from '../types'
import {
  clamp,
  parseNumberLineProps,
  snapToRational,
  valueToX,
  xToValue,
  type NumberLineState,
} from './utils'

const SVG_WIDTH = 320
const SVG_HEIGHT = 100
const PADDING = 24
const AXIS_Y = 44

export function NumberLineWidget({
  widget,
  state,
  onStateChange,
  disabled = false,
}: WidgetComponentProps) {
  const props = parseNumberLineProps(widget.props)
  const min = props.min ?? 0
  const max = props.max ?? 10
  const snapDenominator = props.snapDenominator
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const [dragValue, setDragValue] = useState<number | null>(null)
  const normalized = useRef(false)

  const markerPosition =
    typeof state.markerPosition === 'number'
      ? clamp(state.markerPosition, min, max)
      : props.initialMarker ?? (min + max) / 2

  const markerFraction =
    typeof state.markerFraction === 'string' ? state.markerFraction : undefined

  const displayPosition = dragValue ?? markerPosition

  const updatePosition = (value: number) => {
    const clamped = clamp(value, min, max)
    if (snapDenominator) {
      const snapped = snapToRational(clamped, snapDenominator)
      const snappedValue = clamp(snapped.value, min, max)
      setDragValue(snappedValue)
      onStateChange({
        markerPosition: snappedValue,
        markerFraction: snapped.label,
      } satisfies NumberLineState)
      return
    }
    setDragValue(clamped)
    onStateChange({ markerPosition: clamped } satisfies NumberLineState)
  }

  useEffect(() => {
    if (!snapDenominator || normalized.current) return
    if (markerFraction !== undefined) return
    normalized.current = true
    const snapped = snapToRational(markerPosition, snapDenominator)
    onStateChange({
      markerPosition: clamp(snapped.value, min, max),
      markerFraction: snapped.label,
    } satisfies NumberLineState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapDenominator])

  const positionFromClientX = (clientX: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const scale = SVG_WIDTH / rect.width
    const localX = (clientX - rect.left) * scale
    updatePosition(xToValue(localX, min, max, SVG_WIDTH, PADDING))
  }

  const onPointerDown = (event: ReactPointerEvent) => {
    if (disabled) return
    dragging.current = true
    if ('setPointerCapture' in event.currentTarget) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    positionFromClientX(event.clientX)
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    if (!dragging.current || disabled) return
    positionFromClientX(event.clientX)
  }

  const endDrag = (event: ReactPointerEvent) => {
    dragging.current = false
    setDragValue(null)
    if ('releasePointerCapture' in event.currentTarget) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const markerX = valueToX(displayPosition, min, max, SVG_WIDTH, PADDING)

  return (
    <div className="space-y-3" data-widget="number_line">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`Number line from ${min} to ${max}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {props.intervals?.map((interval, index) => {
          const x1 = valueToX(interval.start, min, max, SVG_WIDTH, PADDING)
          const x2 = valueToX(interval.end, min, max, SVG_WIDTH, PADDING)
          return (
            <g key={index}>
              <rect
                x={Math.min(x1, x2)}
                y={AXIS_Y - 12}
                width={Math.abs(x2 - x1)}
                height={24}
                rx={4}
                className="fill-brand/20 stroke-brand/40"
                strokeWidth={1}
              />
              {interval.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={AXIS_Y - 18}
                  textAnchor="middle"
                  className="fill-brand text-[10px] font-medium"
                >
                  {interval.label}
                </text>
              )}
            </g>
          )
        })}

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
          y={AXIS_Y + 20}
          textAnchor="middle"
          className="fill-ink-muted text-[11px]"
        >
          {min}
        </text>
        <text
          x={SVG_WIDTH - PADDING}
          y={AXIS_Y + 20}
          textAnchor="middle"
          className="fill-ink-muted text-[11px]"
        >
          {max}
        </text>

        {props.markers?.map((marker, index) => {
          const x = valueToX(marker.value, min, max, SVG_WIDTH, PADDING)
          return (
            <g key={index}>
              <line
                x1={x}
                y1={AXIS_Y - 16}
                x2={x}
                y2={AXIS_Y + 16}
                className="stroke-ink-muted/50"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              {marker.label && (
                <text
                  x={x}
                  y={AXIS_Y + 38}
                  textAnchor="middle"
                  className="fill-ink-muted text-[11px]"
                  dominantBaseline="hanging"
                >
                  {marker.label}
                </text>
              )}
            </g>
          )
        })}

        <circle cx={markerX} cy={AXIS_Y} r={22} className="fill-transparent" />
        <circle
          cx={markerX}
          cy={AXIS_Y}
          r={10}
          className={`fill-brand stroke-white stroke-2 ${disabled ? 'opacity-50' : 'cursor-grab active:cursor-grabbing'}`}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={displayPosition}
          aria-label="Adjust value on number line"
        />
      </svg>

      <p className="text-center text-sm text-ink-muted">
        Current value:{' '}
        {snapDenominator ? (
          <span className="font-mono font-medium text-ink">
            {snapToRational(displayPosition, snapDenominator).label}{' '}
            <span className="text-ink-muted">
              (≈ {displayPosition.toFixed(3).replace(/\.?0+$/, '')})
            </span>
          </span>
        ) : (
          <span className="font-mono font-medium text-ink">
            {displayPosition.toFixed(3).replace(/\.?0+$/, '')}
          </span>
        )}
      </p>
    </div>
  )
}
