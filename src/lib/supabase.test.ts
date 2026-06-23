import { describe, expect, it } from 'vitest'

import { isSupabaseConfigured, supabase } from './supabase'

const hasEnv = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY),
)

describe('supabase client', () => {
  it('reflects env configuration', () => {
    expect(isSupabaseConfigured).toBe(hasEnv)
    if (hasEnv) {
      expect(supabase).not.toBeNull()
    } else {
      expect(supabase).toBeNull()
    }
  })
})
