import { describe, expect, it } from 'vitest'

import { buildCourseGraph, HUB_OUT_DEGREE } from './build-graph'
import { loadAllLessons } from '../content/schema-loader'

describe('buildCourseGraph', () => {
  const graph = buildCourseGraph()

  it('has one node per lesson (34)', () => {
    expect(graph.nodes).toHaveLength(34)
  })

  it('emits one edge per resolvable prerequisite', () => {
    const lessons = loadAllLessons()
    const knownIds = new Set(lessons.map((l) => l.lessonId))
    const expectedEdgeCount = lessons.reduce(
      (sum, l) => sum + l.prerequisites.filter((p) => knownIds.has(p)).length,
      0,
    )
    expect(graph.edges).toHaveLength(expectedEdgeCount)
  })

  it('orients every edge prerequisite → dependent', () => {
    const nodeById = new Map(graph.nodes.map((n) => [n.lessonId, n]))
    for (const edge of graph.edges) {
      const dependent = nodeById.get(edge.to)
      expect(dependent).toBeDefined()
      // The `from` endpoint must be listed as a prerequisite of `to`.
      expect(dependent!.prerequisites).toContain(edge.from)
      // Both endpoints must be real nodes.
      expect(nodeById.has(edge.from)).toBe(true)
    }
  })

  it('computes out-degree as the number of dependents', () => {
    for (const node of graph.nodes) {
      const dependents = graph.edges.filter((e) => e.from === node.lessonId)
      expect(node.outDegree).toBe(dependents.length)
      expect(node.isHub).toBe(node.outDegree >= HUB_OUT_DEGREE)
    }
  })

  it('marks lub, seq-limits and continuity as hubs', () => {
    const nodeById = new Map(graph.nodes.map((n) => [n.lessonId, n]))
    for (const id of [
      'lesson-lub-01',
      'lesson-seq-limits-01',
      'lesson-continuity-01',
    ]) {
      const node = nodeById.get(id)
      expect(node, id).toBeDefined()
      expect(node!.isHub, id).toBe(true)
    }
  })

  it('treats a leaf lesson as out-degree 0', () => {
    const leaf = graph.nodes.find((n) => n.lessonId === 'lesson-archimedean-01')
    expect(leaf).toBeDefined()
    expect(leaf!.outDegree).toBe(0)
    expect(leaf!.isHub).toBe(false)
  })

  it('sets unitIndex from course order (rationals in unit 0)', () => {
    const rationals = graph.nodes.find(
      (n) => n.lessonId === 'lesson-rationals-01',
    )
    expect(rationals!.unitIndex).toBe(0)
  })

  it('is deterministic', () => {
    expect(buildCourseGraph()).toEqual(graph)
  })
})
