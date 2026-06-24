import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import type { Profile } from '../lib/database.types'

export type AuthContextValue = {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<{ error: string | null; message?: string | null }>
  signIn: (
    login: string,
    password: string,
  ) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
