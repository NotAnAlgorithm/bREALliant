export type FractionLineBand = {
  label?: string
  side: 'below' | 'above'
}

export type FractionLineProps = {
  min: number
  max: number
  inputs: 1 | 2
  showMidpoint: boolean
  transform: 'none' | 'square'
  target: number | null
  bands: FractionLineBand[]
  defaultA: [number, number]
  defaultB: [number, number]
}

export type FractionLineState = {
  aNum: number
  aDen: number
  bNum?: number
  bDen?: number
}

function asPair(value: unknown, fallback: [number, number]): [number, number] {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    return [value[0], value[1]]
  }
  return fallback
}

export function parseFractionLineProps(
  props: Record<string, unknown>,
): FractionLineProps {
  const inputs = props.inputs === 2 ? 2 : 1
  const transform = props.transform === 'square' ? 'square' : 'none'
  return {
    min: typeof props.min === 'number' ? props.min : 0,
    max: typeof props.max === 'number' ? props.max : 1,
    inputs,
    showMidpoint: props.showMidpoint === true,
    transform,
    target: typeof props.target === 'number' ? props.target : null,
    bands: Array.isArray(props.bands)
      ? (props.bands as FractionLineBand[])
      : [],
    defaultA: asPair(props.defaultA, inputs === 2 ? [1, 3] : [1, 2]),
    defaultB: asPair(props.defaultB, [1, 2]),
  }
}

/** Evaluate a fraction num/den, returning null for invalid input. */
export function fractionValue(num: number, den: number): number | null {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null
  return num / den
}
