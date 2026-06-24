import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { formatAuthError } from '../lib/auth/format-auth-error'
import { ensureProfile, fetchProfile } from '../lib/auth/profile'
import type { Profile } from '../lib/database.types'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

async function loadProfileForUser(userId: string) {
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.id === userId) {
    return ensureProfile(user)
  }

  return fetchProfile(userId)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Awaited<
    ReturnType<NonNullable<typeof supabase>['auth']['getSession']>
  >['data']['session']>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const refreshProfile = useCallback(async (userId: string) => {
    try {
      const nextProfile = await loadProfileForUser(userId)
      setProfile(nextProfile)
    } catch (error) {
      console.error(error)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        loadProfileForUser(data.session.user.id)
          .then((nextProfile) => {
            if (mounted) setProfile(nextProfile)
          })
          .catch(console.error)
          .finally(() => {
            if (mounted) setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) {
        loadProfileForUser(nextSession.user.id)
          .then(setProfile)
          .catch(console.error)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, username: string) => {
      if (!supabase) return { error: 'Supabase is not configured' }

      const trimmedEmail = email.trim()
      const trimmedUsername = username.trim()
      if (trimmedUsername.length < 2) {
        return { error: 'Username must be at least 2 characters' }
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { username: trimmedUsername },
        },
      })

      if (error) return { error: formatAuthError(error.message) }
      if (!data.user) return { error: 'Sign up failed' }

      if (data.session?.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          username: trimmedUsername,
          email: trimmedEmail,
        })

        if (profileError) {
          if (!profileError.message.includes('does not exist')) {
            await supabase.auth.signOut()

            if (profileError.code === '23505') {
              if (profileError.message.includes('username')) {
                return { error: 'That username is already taken. Try another.' }
              }
              return { error: 'An account with this email already exists.' }
            }

            return { error: profileError.message }
          }
        }

        const nextProfile = await loadProfileForUser(data.user.id)
        setProfile(nextProfile)
        return { error: null }
      }

      return {
        error: null,
        message: 'Account created. Check your email to confirm, then sign in.',
      }
    },
    [],
  )

  const signIn = useCallback(async (login: string, password: string) => {
    if (!supabase) return { error: 'Supabase is not configured' }

    const trimmedLogin = login.trim()
    if (!trimmedLogin) {
      return { error: 'Enter your email or username' }
    }

    const { data: resolvedEmail, error: lookupError } = await supabase.rpc(
      'resolve_sign_in_email',
      { login_identifier: trimmedLogin },
    )

    if (lookupError) return { error: lookupError.message }
    if (!resolvedEmail) {
      return { error: 'Invalid email/username or password' }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    })

    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        return { error: 'Invalid email/username or password' }
      }

      return { error: formatAuthError(error.message) }
    }

    if (data.user) {
      await refreshProfile(data.user.id)
    }

    return { error: null }
  }, [refreshProfile])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
    }),
    [session, profile, loading, signUp, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
