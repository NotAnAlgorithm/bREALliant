import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'
import { loadDueConcepts, type DueConcept } from '../services/review'
import { useAuth } from './useAuth'

export type DueReviewsState = {
  due: DueConcept[]
  dueCount: number
  loading: boolean
  refresh: () => void
}

const EMPTY: DueConcept[] = []

export function useDueReviews(): DueReviewsState {
  const { user } = useAuth()
  const [due, setDue] = useState<DueConcept[]>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    if (!user || !supabase) {
      void Promise.resolve().then(() => {
        if (cancelled) return
        setDue(EMPTY)
        setLoading(false)
      })
      return () => {
        cancelled = true
      }
    }

    loadDueConcepts(supabase, user.id)
      .then((concepts) => {
        if (!cancelled) setDue(concepts)
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) setDue(EMPTY)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, nonce])

  return { due, dueCount: due.length, loading, refresh }
}
