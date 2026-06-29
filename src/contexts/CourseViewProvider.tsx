import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { CourseViewContext, type CourseView } from './course-view-context'

const STORAGE_KEY = 'course-view'
const DEFAULT_VIEW: CourseView = 'map'

function getStoredView(): CourseView | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'map' || stored === 'list' ? stored : null
  } catch {
    return null
  }
}

function getInitialView(): CourseView {
  return getStoredView() ?? DEFAULT_VIEW
}

export function CourseViewProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<CourseView>(getInitialView)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, view)
    } catch {
      // ignore persistence failures (e.g. private mode / disabled storage)
    }
  }, [view])

  const setView = useCallback((next: CourseView) => {
    setViewState(next)
  }, [])

  const toggleView = useCallback(() => {
    setViewState((prev) => (prev === 'map' ? 'list' : 'map'))
  }, [])

  const value = useMemo(
    () => ({ view, setView, toggleView }),
    [view, setView, toggleView],
  )

  return (
    <CourseViewContext.Provider value={value}>
      {children}
    </CourseViewContext.Provider>
  )
}
