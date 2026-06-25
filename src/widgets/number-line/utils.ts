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
  snapDenominator?: number
}

export type NumberLineState = {
  markerPosition: number
  markerFraction?: string
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
    snapDenominator:
      typeof props.snapDenominator === 'number' &&
      Number.isFinite(props.snapDenominator) &&
      props.snapDenominator > 0
        ? props.snapDenominator
        : undefined,
  }
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) {
    ;[x, y] = [y, x % y]
  }
  return x
}

export function reduceFraction(num: number, den: number): [number, number] {
  if (den === 0) return [num, den]
  const divisor = gcd(num, den) || 1
  let reducedNum = num / divisor
  let reducedDen = den / divisor
  if (reducedDen < 0) {
    reducedNum = -reducedNum
    reducedDen = -reducedDen
  }
  if (reducedNum === 0) return [0, 1]
  return [reducedNum, reducedDen]
}

export function formatFraction(num: number, den: number): string {
  if (num === 0) return '0'
  if (den === 1) return `${num}`
  return `${num}/${den}`
}

export function snapToRational(
  value: number,
  denominator: number,
): { value: number; num: number; den: number; label: string } {
  const rawNum = Math.round(value * denominator)
  const [num, den] = reduceFraction(rawNum, denominator)
  return { value: num / den, num, den, label: formatFraction(num, den) }
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
