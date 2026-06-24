import { describe, expect, it } from 'vitest'

import { matchPattern, resolveIncorrectMessage } from './match-pattern'

describe('matchPattern', () => {
  it('matches wildcard', () => {
    expect(matchPattern('*', 'anything')).toBe(true)
  })

  it('matches exact answer', () => {
    expect(matchPattern('2', '2')).toBe(true)
    expect(matchPattern('2', '3')).toBe(false)
  })
})

describe('resolveIncorrectMessage', () => {
  it('returns first matching hint', () => {
    const message = resolveIncorrectMessage(
      [
        { match: '2', message: 'Too high' },
        { match: '*', message: 'Generic hint' },
      ],
      '2',
    )
    expect(message).toBe('Too high')
  })

  it('falls back to wildcard', () => {
    const message = resolveIncorrectMessage(
      [{ match: '*', message: 'Generic hint' }],
      '0.5',
    )
    expect(message).toBe('Generic hint')
  })
})
