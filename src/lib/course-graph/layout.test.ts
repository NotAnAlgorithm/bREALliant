import { describe, expect, it } from 'vitest'

import { buildCourseGraph } from './build-graph'
import {
  autoLayout,
  buildEdgePath,
  gridToPixel,
  layoutCourseGraph,
  manualLayout,
} from './layout'
import { GRID } from './manual-layout'

import type { CourseGraph, CourseGraphNode } from './types'

/** Minimal node factory for synthetic graphs. */
function node(
  lessonId: string,
  prerequisites: string[] = [],
  unitIndex = 0,
): CourseGraphNode {
  return {
    lessonId,
    title: lessonId,
    unitId: `unit-${unitIndex}`,
    unitIndex,
    tags: [],
    prerequisites,
    outDegree: 0,
    isHub: false,
  }
}

/** Build edges + out-degrees from a node list's prerequisites. */
function graphFromNodes(nodes: CourseGraphNode[]): CourseGraph {
  const ids = new Set(nodes.map((n) => n.lessonId))
  const edges = nodes.flatMap((n) =>
    n.prerequisites
      .filter((p) => ids.has(p))
      .map((p) => ({ from: p, to: n.lessonId })),
  )
  const out = new Map<string, number>()
  for (const e of edges) out.set(e.from, (out.get(e.from) ?? 0) + 1)
  return {
    nodes: nodes.map((n) => ({ ...n, outDegree: out.get(n.lessonId) ?? 0 })),
    edges,
  }
}

describe('gridToPixel + buildEdgePath', () => {
  it('maps the origin cell to the top-left margin', () => {
    expect(gridToPixel({ col: 0, row: 0 })).toEqual({
      x: GRID.marginX,
      y: GRID.marginY,
    })
  })

  it('advances by colGap / rowGap', () => {
    expect(gridToPixel({ col: 2, row: 3 })).toEqual({
      x: GRID.marginX + 2 * GRID.colGap,
      y: GRID.marginY + 3 * GRID.rowGap,
    })
  })

  it('produces a non-empty cubic SVG path', () => {
    const d = buildEdgePath({ x: 0, y: 0 }, { x: 10, y: 100 })
    expect(d.length).toBeGreaterThan(0)
    expect(d.startsWith('M')).toBe(true)
    expect(d).toContain('C')
  })
})

describe('manualLayout (the default)', () => {
  const graph = buildCourseGraph()
  const positioned = manualLayout(graph)

  it('is the strategy the app uses by default', () => {
    expect(layoutCourseGraph).toBe(manualLayout)
  })

  it('positions every node with finite coordinates', () => {
    expect(positioned.nodes).toHaveLength(graph.nodes.length)
    for (const n of positioned.nodes) {
      expect(Number.isFinite(n.x)).toBe(true)
      expect(Number.isFinite(n.y)).toBe(true)
    }
  })

  it('never overlaps two nodes on the same pixel', () => {
    const seen = new Set<string>()
    for (const n of positioned.nodes) {
      const key = `${n.x}:${n.y}`
      expect(seen.has(key), `${n.lessonId} overlaps at ${key}`).toBe(false)
      seen.add(key)
    }
  })

  it('has a positive-sized canvas', () => {
    expect(positioned.width).toBeGreaterThan(0)
    expect(positioned.height).toBeGreaterThan(0)
  })

  it('gives every edge a non-empty path with border anchors', () => {
    expect(positioned.edges).toHaveLength(graph.edges.length)
    for (const e of positioned.edges) {
      expect(e.path.length).toBeGreaterThan(0)
      expect(Number.isFinite(e.fromPoint.x)).toBe(true)
      expect(Number.isFinite(e.toPoint.y)).toBe(true)
    }
  })

  it('is deterministic across runs', () => {
    expect(manualLayout(graph)).toEqual(positioned)
  })
})

describe('manualLayout fallback for unmapped lessons', () => {
  it('auto-places a lesson that is not in the manual map', () => {
    const synthetic = graphFromNodes([
      node('lesson-rationals-01'),
      node('lesson-ordered-fields-01', ['lesson-rationals-01']),
      // Not present in MANUAL_POSITIONS — must still get a position.
      node('lesson-future-topic-99', ['lesson-ordered-fields-01']),
    ])
    const out = manualLayout(synthetic)
    const future = out.nodes.find((n) => n.lessonId === 'lesson-future-topic-99')
    expect(future).toBeDefined()
    expect(Number.isFinite(future!.x)).toBe(true)
    expect(Number.isFinite(future!.y)).toBe(true)
    // Distinct cell from the curated nodes.
    const keys = out.nodes.map((n) => `${n.x}:${n.y}`)
    expect(new Set(keys).size).toBe(out.nodes.length)
  })
})

describe('autoLayout (the future pivot)', () => {
  const graph = buildCourseGraph()

  it('positions every node uniquely', () => {
    const out = autoLayout(graph)
    expect(out.width).toBeGreaterThan(0)
    expect(out.height).toBeGreaterThan(0)
    const keys = out.nodes.map((n) => `${n.x}:${n.y}`)
    expect(new Set(keys).size).toBe(out.nodes.length)
  })

  it('never places a dependent in a row above its prerequisite', () => {
    const out = autoLayout(graph)
    const byId = new Map(out.nodes.map((n) => [n.lessonId, n]))
    for (const e of out.edges) {
      const from = byId.get(e.from)!
      const to = byId.get(e.to)!
      // dependent (`to`) must sit strictly below its prerequisite (`from`).
      expect(to.row, `${e.from} → ${e.to}`).toBeGreaterThan(from.row)
    }
  })

  it('is deterministic across runs', () => {
    expect(autoLayout(graph)).toEqual(autoLayout(graph))
  })

  it('keeps the DAG ordering on a synthetic diamond', () => {
    const out = autoLayout(
      graphFromNodes([
        node('a'),
        node('b', ['a']),
        node('c', ['a']),
        node('d', ['b', 'c']),
      ]),
    )
    const byId = new Map(out.nodes.map((n) => [n.lessonId, n]))
    expect(byId.get('a')!.row).toBe(0)
    expect(byId.get('d')!.row).toBeGreaterThan(byId.get('b')!.row)
    expect(byId.get('d')!.row).toBeGreaterThan(byId.get('c')!.row)
  })
})
