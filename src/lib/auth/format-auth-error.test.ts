import { describe, expect, it } from 'vitest'

import { formatAuthError } from './format-auth-error'

describe('formatAuthError', () => {
  it('explains Supabase email rate limits', () => {
    const message = formatAuthError('email rate limit exceeded')
    expect(message).toContain('Confirm email')
    expect(message).toContain('Supabase')
  })

  it('passes through other messages', () => {
    expect(formatAuthError('Invalid login credentials')).toBe(
      'Invalid login credentials',
    )
  })
})
