import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'
import { loadCourseProgress } from '../services/progress'
import { useAuth } from './useAuth'

export type CourseProgressState = {
  completedIds: Set<string>
  inProgressIds: Set<string>
  loading: boolean
  refresh: () => void
}

const EMPTY = new Set<string>()

export function useCourseProgress(): CourseProgressState {
  const { user } = useAuth()
  const [completedIds, setCompletedIds] = useState<Set<string>>(EMPTY)
  const [inProgressIds, setInProgressIds] = useState<Set<string>>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    if (!user || !supabase) {
      void Promise.resolve().then(() => {
        if (cancelled) return
        setCompletedIds(EMPTY)
        setInProgressIds(EMPTY)
        setLoading(false)
      })
      return () => {
        cancelled = true
      }
    }

    loadCourseProgress(supabase, user.id)
      .then((summary) => {
        if (cancelled) return
        setCompletedIds(new Set(summary.completedIds))
        setInProgressIds(new Set(summary.inProgressIds))
      })
      .catch((error) => {
        console.error(error)
        if (cancelled) return
        setCompletedIds(EMPTY)
        setInProgressIds(EMPTY)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, nonce])

  return { completedIds, inProgressIds, loading, refresh }
}
