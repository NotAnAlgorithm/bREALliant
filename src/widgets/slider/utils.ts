import { all, create } from 'mathjs'

const math = create(all, {})

export type SliderMarker = { value: number; label?: string }

// A derived quantity shown live beneath the slider. `expression` is evaluated
// with mathjs against a scope where the slider value is bound to n, x, and v —
// e.g. { label: "1/n", expression: "1/n" } visualizes 1/n -> 0.
export type SliderReadout = { label: string; expression: string }

export type SliderProps = {
  min: number
  max: number
  step: number
  initialValue: number
  label?: string
  unit?: string
  markers: SliderMarker[]
  readouts: SliderReadout[]
}

export type SliderState = { value: number }

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseMarkers(value: unknown): SliderMarker[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const candidate = entry as { value?: unknown; label?: unknown }
    if (typeof candidate.value !== 'number' || !Number.isFinite(candidate.value)) {
      return []
    }
    return [
      {
        value: candidate.value,
        label: typeof candidate.label === 'string' ? candidate.label : undefined,
      },
    ]
  })
}

function parseReadouts(value: unknown): SliderReadout[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const candidate = entry as { label?: unknown; expression?: unknown }
    if (
      typeof candidate.label !== 'string' ||
      typeof candidate.expression !== 'string'
    ) {
      return []
    }
    return [{ label: candidate.label, expression: candidate.expression }]
  })
}

export function parseSliderProps(props: Record<string, unknown>): SliderProps {
  const min = num(props.min, 0)
  const max = num(props.max, 10)
  const step = Math.abs(num(props.step, 1)) || 1
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  const initialValue = clampToRange(num(props.initialValue, lo), lo, hi)
  return {
    min: lo,
    max: hi,
    step,
    initialValue,
    label: typeof props.label === 'string' ? props.label : undefined,
    unit: typeof props.unit === 'string' ? props.unit : undefined,
    markers: parseMarkers(props.markers),
    readouts: parseReadouts(props.readouts),
  }
}

export function clampToRange(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Evaluate a readout expression with the slider value bound to n, x, and v. */
export function evalReadout(expression: string, value: number): string {
  try {
    const result = math.evaluate(expression, { n: value, x: value, v: value })
    if (typeof result === 'number' && Number.isFinite(result)) {
      // Trim trailing zeros for a clean readout.
      return Number(result.toFixed(4)).toString()
    }
    return '—'
  } catch {
    return '—'
  }
}

/** Format the raw slider value, dropping needless trailing zeros. */
export function formatValue(value: number): string {
  return Number(value.toFixed(4)).toString()
}
