export type NumberLineInterval = {
  start: number
  end: number
  label?: string
}

export type NumberLineMarker = {
  value: number
  label?: string
}

export type NumberLineProps = {
  min?: number
  max?: number
  intervals?: NumberLineInterval[]
  markers?: NumberLineMarker[]
  initialMarker?: number
}

export type NumberLineState = {
  markerPosition: number
}

export function parseNumberLineProps(props: Record<string, unknown>): NumberLineProps {
  return {
    min: typeof props.min === 'number' ? props.min : undefined,
    max: typeof props.max === 'number' ? props.max : undefined,
    intervals: Array.isArray(props.intervals)
      ? (props.intervals as NumberLineInterval[])
      : undefined,
    markers: Array.isArray(props.markers)
      ? (props.markers as NumberLineMarker[])
      : undefined,
    initialMarker:
      typeof props.initialMarker === 'number' ? props.initialMarker : undefined,
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function valueToX(
  value: number,
  min: number,
  max: number,
  width: number,
  padding: number,
): number {
  const ratio = (value - min) / (max - min)
  return padding + ratio * (width - padding * 2)
}

export function xToValue(
  x: number,
  min: number,
  max: number,
  width: number,
  padding: number,
): number {
  const ratio = (x - padding) / (width - padding * 2)
  return min + clamp(ratio, 0, 1) * (max - min)
}
