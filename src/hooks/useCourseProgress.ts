import { useCallback, useEffect, useState } from 'react'

import type { MasteryStateValue } from '../lib/database.types'
import { supabase } from '../lib/supabase'
import { loadCourseProgress, type ConceptMasterySummary } from '../services/progress'
import { useAuth } from './useAuth'

export type MasteryByTag = Map<string, MasteryStateValue>

export type CourseProgressState = {
  completedIds: Set<string>
  inProgressIds: Set<string>
  masteryByTag: MasteryByTag
  mastery: ConceptMasterySummary[]
  loading: boolean
  refresh: () => void
}

const EMPTY = new Set<string>()
const EMPTY_MASTERY: MasteryByTag = new Map()
const EMPTY_SUMMARY: ConceptMasterySummary[] = []

export function useCourseProgress(): CourseProgressState {
  const { user } = useAuth()
  const [completedIds, setCompletedIds] = useState<Set<string>>(EMPTY)
  const [inProgressIds, setInProgressIds] = useState<Set<string>>(EMPTY)
  const [masteryByTag, setMasteryByTag] = useState<MasteryByTag>(EMPTY_MASTERY)
  const [mastery, setMastery] = useState<ConceptMasterySummary[]>(EMPTY_SUMMARY)
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
        setMasteryByTag(EMPTY_MASTERY)
        setMastery(EMPTY_SUMMARY)
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
        setMasteryByTag(
          new Map(summary.mastery.map((m) => [m.tag, m.state])),
        )
        setMastery(summary.mastery)
      })
      .catch((error) => {
        console.error(error)
        if (cancelled) return
        setCompletedIds(EMPTY)
        setInProgressIds(EMPTY)
        setMasteryByTag(EMPTY_MASTERY)
        setMastery(EMPTY_SUMMARY)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, nonce])

  return { completedIds, inProgressIds, masteryByTag, mastery, loading, refresh }
}
