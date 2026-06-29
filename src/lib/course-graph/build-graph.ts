/**
 * Builds the pure prerequisite DAG for the Course Map from the content
 * fixtures. No layout, no React — just nodes + edges + a couple of derived
 * metrics. Deterministic: same fixtures always produce the same graph.
 */
import { loadAllLessons, loadCourse } from '../content/schema-loader'

import type { CourseGraph, CourseGraphEdge, CourseGraphNode } from './types'

/**
 * A lesson is a "hub" once at least this many other lessons depend on it.
 * Hubs (e.g. `lesson-lub-01`, `lesson-seq-limits-01`, `lesson-continuity-01`)
 * get visual emphasis and are centered by the manual layout.
 */
export const HUB_OUT_DEGREE = 4

/**
 * Construct the course prerequisite graph.
 *
 * - Nodes are emitted in course order (units flattened in their declared order,
 *   lessons in each unit's declared order).
 * - Edges point prerequisite → dependent. An edge is only created when BOTH
 *   endpoints exist as real lessons, so dangling prereq ids never crash us.
 * - `outDegree` counts how many edges leave a node (how many lessons need it).
 */
export function buildCourseGraph(): CourseGraph {
  const course = loadCourse()
  const lessons = loadAllLessons()

  // Fast membership + lookup for known lessons.
  const lessonById = new Map(lessons.map((lesson) => [lesson.lessonId, lesson]))

  // Map every lesson id to the 0-based index of the unit that contains it.
  const unitIndexByLesson = new Map<string, number>()
  const unitIdByLesson = new Map<string, string>()
  course.units.forEach((unit, unitIndex) => {
    for (const lessonId of unit.lessonIds) {
      unitIndexByLesson.set(lessonId, unitIndex)
      unitIdByLesson.set(lessonId, unit.unitId)
    }
  })

  // Lessons in course order. Fall back to the lesson's own order for any lesson
  // that the course file does not place in a unit (robustness only).
  const orderedLessonIds: string[] = course.units.flatMap((unit) =>
    unit.lessonIds.filter((id) => lessonById.has(id)),
  )
  for (const lesson of lessons) {
    if (!unitIndexByLesson.has(lesson.lessonId)) {
      orderedLessonIds.push(lesson.lessonId)
    }
  }

  // Build edges first so we can derive out-degrees from them.
  const edges: CourseGraphEdge[] = []
  for (const lessonId of orderedLessonIds) {
    const lesson = lessonById.get(lessonId)
    if (!lesson) continue
    for (const prereqId of lesson.prerequisites) {
      // Only keep edges between two lessons we actually know about.
      if (lessonById.has(prereqId)) {
        edges.push({ from: prereqId, to: lessonId })
      }
    }
  }

  // out-degree = number of edges whose `from` is this lesson.
  const outDegreeById = new Map<string, number>()
  for (const edge of edges) {
    outDegreeById.set(edge.from, (outDegreeById.get(edge.from) ?? 0) + 1)
  }

  const nodes: CourseGraphNode[] = orderedLessonIds.map((lessonId) => {
    const lesson = lessonById.get(lessonId)!
    const outDegree = outDegreeById.get(lessonId) ?? 0
    return {
      lessonId,
      title: lesson.title,
      unitId: unitIdByLesson.get(lessonId) ?? '',
      unitIndex: unitIndexByLesson.get(lessonId) ?? course.units.length,
      tags: [...lesson.tags],
      // Keep only prereqs that resolve to known lessons, matching the edges.
      prerequisites: lesson.prerequisites.filter((id) => lessonById.has(id)),
      outDegree,
      isHub: outDegree >= HUB_OUT_DEGREE,
    }
  })

  return { nodes, edges }
}
