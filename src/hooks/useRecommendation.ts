import { useMemo } from 'react'

import { loadAllLessons, loadCourse } from '../lib/content/schema-loader'
import {
  recommendNextUp,
  type LessonMeta,
  type Recommendation,
} from '../lib/recommend/next-up'
import { isRetained } from '../services/mastery'
import { flattenLessonIds } from '../services/unlock'
import { useCourseProgress } from './useCourseProgress'
import { useDueReviews } from './useDueReviews'

export type RecommendationState = {
  recommendation: Recommendation | null
  loading: boolean
  refresh: () => void
}

/**
 * Assembles the inputs for the pure {@link recommendNextUp} policy from the
 * learner's course progress, mastery, and due spaced reviews.
 */
export function useRecommendation(): RecommendationState {
  const progress = useCourseProgress()
  const due = useDueReviews()

  const loading = progress.loading || due.loading

  const recommendation = useMemo<Recommendation | null>(() => {
    if (loading) return null

    const course = loadCourse()
    const lessons = loadAllLessons()
    const orderedLessonIds = flattenLessonIds(course)
    const lessonsById = new Map<string, LessonMeta>(
      lessons.map((lesson) => [
        lesson.lessonId,
        {
          lessonId: lesson.lessonId,
          title: lesson.title,
          tags: lesson.tags,
          prerequisites: lesson.prerequisites,
        },
      ]),
    )
    const retainedTags = new Set(
      progress.mastery.filter((m) => isRetained(m.state)).map((m) => m.tag),
    )

    return recommendNextUp({
      orderedLessonIds,
      lessonsById,
      completedIds: progress.completedIds,
      retainedTags,
      mastery: progress.mastery,
      dueCount: due.dueCount,
    })
  }, [loading, progress.completedIds, progress.mastery, due.dueCount])

  return {
    recommendation,
    loading,
    refresh: () => {
      progress.refresh()
      due.refresh()
    },
  }
}
