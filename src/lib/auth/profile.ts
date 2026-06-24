import type { User } from '@supabase/supabase-js'

import type { Profile } from '../database.types'
import { supabase } from '../supabase'

function isMissingRelationError(message: string): boolean {
  return message.includes('does not exist') || message.includes('Could not find the table')
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    if (isMissingRelationError(error.message)) return null
    throw error
  }

  return data
}

export async function ensureProfile(user: User): Promise<Profile | null> {
  if (!supabase) return null

  const existing = await fetchProfile(user.id)
  if (existing) return existing

  const metaUsername = user.user_metadata?.username
  if (typeof metaUsername !== 'string' || metaUsername.trim().length < 2) {
    return null
  }

  if (!user.email) return null

  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    username: metaUsername.trim(),
    email: user.email,
  })

  if (error) {
    if (isMissingRelationError(error.message)) return null
    console.error('Failed to create profile', error)
    return null
  }

  return fetchProfile(user.id)
}

export function displayUsername(
  profile: Profile | null,
  user: User | null,
): string | null {
  if (profile?.username) return profile.username

  const metaUsername = user?.user_metadata?.username
  if (typeof metaUsername === 'string' && metaUsername.trim().length >= 2) {
    return metaUsername.trim()
  }

  return null
}
