import type { User } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import type { Profile } from '../database.types'
import { displayUsername } from './profile'

describe('displayUsername', () => {
  it('prefers profile username', () => {
    const profile = {
      id: '1',
      username: 'alice',
      email: 'a@example.com',
      created_at: '2024-01-01',
    } satisfies Profile

    expect(displayUsername(profile, null)).toBe('alice')
  })

  it('falls back to auth metadata', () => {
    const user = {
      user_metadata: { username: 'bob' },
    } as unknown as User

    expect(displayUsername(null, user)).toBe('bob')
  })
})
