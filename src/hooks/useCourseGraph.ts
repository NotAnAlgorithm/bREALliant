import { useMemo } from 'react'

import { buildCourseGraph } from '../lib/course-graph/build-graph'
import { layoutCourseGraph } from '../lib/course-graph/layout'
import type {
  GraphNodeStatus,
  PositionedGraph,
} from '../lib/course-graph/types'
import { isRetained } from '../services/mastery'
import {
  computeCourseStatuses,
  effectiveSatisfiedIds,
  retainedLessonIds,
} from '../services/unlock'
import { useCourseProgress } from './useCourseProgress'
import { useRecommendation } from './useRecommendation'

/** Per-lesson mastery fraction: how many of a lesson's tags are retained. */
export interface ConceptProgress {
  retained: number
  total: number
}

/**
 * The Course Map's live data: the static, hand-laid prerequisite graph fused
 * with the learner's progress, mastery, and recommendation. The graph geometry
 * is memoized once; only the lightweight status/concept maps re-derive as
 * progress changes.
 */
export interface CourseMapData {
  graph: PositionedGraph
  statusById: Map<string, GraphNodeStatus>
  conceptsById: Map<string, ConceptProgress>
  recommendedLessonId: string | null
  satisfiedIds: Set<string>
  titleById: Map<string, string>
  loading: boolean
}

export function useCourseGraph(): CourseMapData {
  const { completedIds, inProgressIds, masteryByTag, loading } =
    useCourseProgress()
  const { recommendation } = useRecommendation()

  // The graph topology + pixel layout never changes at runtime, so build and
  // lay it out exactly once.
  const graph = useMemo(() => layoutCourseGraph(buildCourseGraph()), [])

  // Tags whose mastery has reached "retained" — mirrors CoursePath precisely.
  const retainedTags = useMemo(
    () =>
      new Set(
        [...masteryByTag.entries()]
          .filter(([, state]) => isRetained(state))
          .map(([tag]) => tag),
      ),
    [masteryByTag],
  )

  // A prerequisite is satisfied by completion OR by full concept retention.
  const satisfiedIds = useMemo(
    () =>
      effectiveSatisfiedIds(
        completedIds,
        retainedLessonIds(graph.nodes, retainedTags),
      ),
    [completedIds, graph.nodes, retainedTags],
  )

  const statusById = useMemo(
    () =>
      computeCourseStatuses(graph.nodes, {
        completedIds: satisfiedIds,
        inProgressIds,
      }) as Map<string, GraphNodeStatus>,
    [graph.nodes, satisfiedIds, inProgressIds],
  )

  const conceptsById = useMemo(() => {
    const map = new Map<string, ConceptProgress>()
    for (const node of graph.nodes) {
      const total = node.tags.length
      const retained = node.tags.filter((tag) => retainedTags.has(tag)).length
      map.set(node.lessonId, { retained, total })
    }
    return map
  }, [graph.nodes, retainedTags])

  const titleById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.lessonId, node.title])),
    [graph.nodes],
  )

  const recommendedLessonId = recommendation?.lessonId ?? null

  return {
    graph,
    statusById,
    conceptsById,
    recommendedLessonId,
    satisfiedIds,
    titleById,
    loading,
  }
}
