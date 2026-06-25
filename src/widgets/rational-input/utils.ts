export type RationalInputState = {
  num: string
  den: string
}

export type RationalInputProps = {
  label?: string
  placeholderNum?: string
  placeholderDen?: string
}

export function parseRationalInputProps(
  props: Record<string, unknown>,
): RationalInputProps {
  return {
    label: typeof props.label === 'string' ? props.label : undefined,
    placeholderNum:
      typeof props.placeholderNum === 'string' ? props.placeholderNum : 'a',
    placeholderDen:
      typeof props.placeholderDen === 'string' ? props.placeholderDen : 'b',
  }
}
