import { useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'
import { loadStreak } from '../services/progress'
import { useAuth } from './useAuth'

export type StreakState = {
  streak: number
  loading: boolean
}

export function useStreak(): StreakState {
  const { user } = useAuth()
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    if (!user || !supabase) {
      void Promise.resolve().then(() => {
        if (cancelled) return
        setStreak(0)
        setLoading(false)
      })
      return () => {
        cancelled = true
      }
    }

    loadStreak(supabase, user.id)
      .then((value) => {
        if (!cancelled) setStreak(value)
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) setStreak(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  return { streak, loading }
}
