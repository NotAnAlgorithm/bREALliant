import { describe, expect, it } from 'vitest'

import { orderOptionsForDisplay } from './shuffle'

const opts = [
  { id: 'a', label: 'alpha' },
  { id: 'b', label: 'beta' },
  { id: 'c', label: 'gamma' },
  { id: 'd', label: 'delta' },
]

describe('orderOptionsForDisplay', () => {
  it('returns a permutation containing exactly the same ids', () => {
    const out = orderOptionsForDisplay(opts, {}, () => 0.99)
    expect(out.map((o) => o.id).sort()).toEqual(['a', 'b', 'c', 'd'])
    expect(out).toHaveLength(opts.length)
  })

  it('actually reorders for a non-trivial rng', () => {
    // A constant 0 rng on Fisher–Yates rotates the array deterministically.
    const out = orderOptionsForDisplay(opts, {}, () => 0)
    expect(out.map((o) => o.id)).not.toEqual(['a', 'b', 'c', 'd'])
  })

  it('keeps the original order when shuffle is disabled via props', () => {
    const out = orderOptionsForDisplay(opts, { shuffle: false }, () => 0)
    expect(out.map((o) => o.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('does not shuffle a single option', () => {
    const single = [{ id: 'a', label: 'only' }]
    expect(orderOptionsForDisplay(single, {}, () => 0)).toEqual(single)
  })

  it.each([
    'All of the above',
    'None of the above',
    'Both of the following statements',
  ])('preserves order when a label references position: %s', (label) => {
    const withMeta = [...opts.slice(0, 3), { id: 'e', label }]
    const out = orderOptionsForDisplay(withMeta, {}, () => 0)
    expect(out.map((o) => o.id)).toEqual(['a', 'b', 'c', 'e'])
  })

  it('does not mutate the input array', () => {
    const input = [...opts]
    orderOptionsForDisplay(input, {}, () => 0)
    expect(input.map((o) => o.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})
