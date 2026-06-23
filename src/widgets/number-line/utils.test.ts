import { describe, expect, it } from 'vitest'

import { clamp, valueToX, xToValue } from './utils'

describe('number-line utils', () => {
  it('clamps values to range', () => {
    expect(clamp(5, 0, 2)).toBe(2)
    expect(clamp(-1, 0, 2)).toBe(0)
  })

  it('converts between value and x coordinate', () => {
    const x = valueToX(1, 0, 2, 320, 24)
    expect(xToValue(x, 0, 2, 320, 24)).toBeCloseTo(1)
  })
})
