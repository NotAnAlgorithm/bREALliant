import { describe, expect, it } from 'vitest'

import {
  clamp,
  formatFraction,
  reduceFraction,
  snapToRational,
  valueToX,
  xToValue,
} from './utils'

describe('number-line utils', () => {
  it('clamps values to range', () => {
    expect(clamp(5, 0, 2)).toBe(2)
    expect(clamp(-1, 0, 2)).toBe(0)
  })

  it('converts between value and x coordinate', () => {
    const x = valueToX(1, 0, 2, 320, 24)
    expect(xToValue(x, 0, 2, 320, 24)).toBeCloseTo(1)
  })

  it('reduces fractions to lowest terms with normalized sign', () => {
    expect(reduceFraction(2, 6)).toEqual([1, 3])
    expect(reduceFraction(1, -2)).toEqual([-1, 2])
    expect(reduceFraction(0, 5)).toEqual([0, 1])
    expect(reduceFraction(4, 2)).toEqual([2, 1])
  })

  it('formats fractions', () => {
    expect(formatFraction(1, 3)).toBe('1/3')
    expect(formatFraction(2, 1)).toBe('2')
    expect(formatFraction(0, 1)).toBe('0')
    expect(formatFraction(-1, 2)).toBe('-1/2')
  })

  it('snaps values to the nearest rational', () => {
    expect(snapToRational(0.34, 3)).toMatchObject({ num: 1, den: 3, label: '1/3' })
    expect(snapToRational(0.5, 2)).toMatchObject({ num: 1, den: 2, label: '1/2' })
    expect(snapToRational(1, 3)).toMatchObject({ num: 1, den: 1, label: '1' })
    expect(snapToRational(0.1, 3)).toMatchObject({ num: 0, den: 1, label: '0' })
  })
})
