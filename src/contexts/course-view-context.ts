import { createContext } from 'react'

export type CourseView = 'map' | 'list'

export type CourseViewContextValue = {
  view: CourseView
  setView: (view: CourseView) => void
  toggleView: () => void
}

export const CourseViewContext = createContext<CourseViewContextValue | null>(
  null,
)
