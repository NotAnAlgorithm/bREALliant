import { useContext } from 'react'

import { CourseViewContext } from '../contexts/course-view-context'

export function useCourseView() {
  const ctx = useContext(CourseViewContext)
  if (!ctx) {
    throw new Error('useCourseView must be used within CourseViewProvider')
  }
  return ctx
}
