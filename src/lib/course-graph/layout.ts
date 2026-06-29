/**
 * Layout strategies for the Course Map.
 *
 * Two interchangeable implementations of `LayoutStrategy`:
 *   • `manualLayout` — the default. Reads hand-authored cells from
 *     `MANUAL_POSITIONS`, with a graceful auto-fallback for any lesson not yet
 *     placed by a human.
 *   • `autoLayout`   — a deterministic layered-DAG layout (longest-path rows +
 *     a barycenter pass to reduce crossings). The future "pivot" option.
 *
 * Switching the app from manual to automatic is a one-line change at the bottom
 * (`layoutCourseGraph`). Everything here is pure and React-free.
 */
import { GRID, MANUAL_POSITIONS } from './manual-layout'

import type {
  CourseGraph,
  GridPosition,
  LayoutStrategy,
  PositionedEdge,
  PositionedGraph,
  PositionedNode,
} from './types'

/** Convert a logical grid cell to a pixel center using the GRID constants. */
export function gridToPixel(pos: GridPosition): { x: number; y: number } {
  return {
    x: GRID.marginX + pos.col * GRID.colGap,
    y: GRID.marginY + pos.row * GRID.rowGap,
  }
}

/**
 * A smooth, vertical-biased cubic Bézier between two pixel points. Control
 * points share the endpoints' x but sit at the vertical midpoint, giving the
 * gentle S-curve typical of dependency maps (and it degrades sensibly for
 * near-horizontal edges too).
 */
export function buildEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const midY = (from.y + to.y) / 2
  return (
    `M ${round(from.x)} ${round(from.y)} ` +
    `C ${round(from.x)} ${round(midY)}, ` +
    `${round(to.x)} ${round(midY)}, ` +
    `${round(to.x)} ${round(to.y)}`
  )
}

/** Trim float noise so paths are stable + diff-friendly (and deterministic). */
function round(n: number): number {
  return Math.round(n * 1000) / 1000
}

/**
 * Longest-path depth from the roots for every node, computed over the graph's
 * edges (prerequisite → dependent). Roots (no incoming edges) get depth 0;
 * every other node is `1 + max(depth(prereq))`. Memoized; safe on any DAG.
 */
function computeDepths(graph: CourseGraph): Map<string, number> {
  const incoming = new Map<string, string[]>()
  for (const node of graph.nodes) incoming.set(node.lessonId, [])
  for (const edge of graph.edges) {
    // Ignore edges to/from unknown nodes for robustness.
    if (incoming.has(edge.to)) incoming.get(edge.to)!.push(edge.from)
  }

  const depth = new Map<string, number>()
  const visiting = new Set<string>()

  const resolve = (id: string): number => {
    const cached = depth.get(id)
    if (cached !== undefined) return cached
    // Cycle guard (the course DAG is acyclic, but never trust input blindly).
    if (visiting.has(id)) return 0
    visiting.add(id)
    const parents = incoming.get(id) ?? []
    let d = 0
    for (const parent of parents) {
      if (incoming.has(parent)) d = Math.max(d, resolve(parent) + 1)
    }
    visiting.delete(id)
    depth.set(id, d)
    return d
  }

  for (const node of graph.nodes) resolve(node.lessonId)
  return depth
}

/**
 * Shared tail end of both strategies: given a final grid cell for every node,
 * produce the positioned graph (pixels, edge paths anchored on node borders,
 * canvas size).
 */
function assemble(
  graph: CourseGraph,
  cellByNode: Map<string, GridPosition>,
): PositionedGraph {
  const nodes: PositionedNode[] = graph.nodes.map((node) => {
    const cell = cellByNode.get(node.lessonId) ?? { col: 0, row: 0 }
    const { x, y } = gridToPixel(cell)
    return { ...node, col: cell.col, row: cell.row, x, y }
  })

  const centerById = new Map(nodes.map((n) => [n.lessonId, { x: n.x, y: n.y }]))

  const edges: PositionedEdge[] = graph.edges.flatMap((edge) => {
    const a = centerById.get(edge.from)
    const b = centerById.get(edge.to)
    if (!a || !b) return []
    const { fromPoint, toPoint } = anchorOnBorders(a, b, GRID.nodeRadius)
    return [{ ...edge, fromPoint, toPoint, path: buildEdgePath(fromPoint, toPoint) }]
  })

  // Canvas size from the extreme node centers + a node radius + margin so the
  // outermost circles are never clipped.
  let maxX = 0
  let maxY = 0
  for (const n of nodes) {
    maxX = Math.max(maxX, n.x)
    maxY = Math.max(maxY, n.y)
  }
  const width = maxX + GRID.nodeRadius + GRID.marginX
  const height = maxY + GRID.nodeRadius + GRID.marginY

  return { nodes, edges, width, height }
}

/** Pull both endpoints in to the node circle's border along the line a→b. */
function anchorOnBorders(
  a: { x: number; y: number },
  b: { x: number; y: number },
  r: number,
): { fromPoint: { x: number; y: number }; toPoint: { x: number; y: number } } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return { fromPoint: { ...a }, toPoint: { ...b } }
  const ux = dx / len
  const uy = dy / len
  return {
    fromPoint: { x: round(a.x + ux * r), y: round(a.y + uy * r) },
    toPoint: { x: round(b.x - ux * r), y: round(b.y - uy * r) },
  }
}

/**
 * MANUAL strategy — the default the app renders.
 *
 * Every node listed in `MANUAL_POSITIONS` uses its hand-authored cell. Any node
 * NOT listed (a future lesson someone added before tuning the map) is auto-
 * placed in a spare column to the right, stacked by topological depth, so new
 * content never collides with the curated layout or with another fallback node.
 */
export const manualLayout: LayoutStrategy = (graph) => {
  const depths = computeDepths(graph)

  // Reserve the first spare column just right of the manual map's widest column.
  let maxManualCol = 0
  for (const pos of Object.values(MANUAL_POSITIONS)) {
    maxManualCol = Math.max(maxManualCol, pos.col)
  }
  const spareColBase = maxManualCol + 2 // +1 gap, +1 for the lane itself

  const cellByNode = new Map<string, GridPosition>()
  const used = new Set<string>()
  const key = (c: GridPosition) => `${c.col}:${c.row}`

  // Place curated nodes first so fallbacks know which cells are occupied.
  for (const node of graph.nodes) {
    const manual = MANUAL_POSITIONS[node.lessonId]
    if (manual) {
      cellByNode.set(node.lessonId, manual)
      used.add(key(manual))
    }
  }

  // Place the rest. Row = topological depth; column = first free spare lane.
  for (const node of graph.nodes) {
    if (cellByNode.has(node.lessonId)) continue
    const row = depths.get(node.lessonId) ?? 0
    let col = spareColBase
    while (used.has(key({ col, row }))) col += 1
    const cell = { col, row }
    cellByNode.set(node.lessonId, cell)
    used.add(key(cell))
  }

  return assemble(graph, cellByNode)
}

/**
 * AUTO strategy — deterministic layered DAG layout (the future "pivot").
 *
 * 1. row = longest-path depth (so a dependent is ALWAYS strictly below every
 *    prerequisite — no edge ever points upward).
 * 2. Within each row, seed an order by (unitIndex, lessonId), then run a few
 *    median/barycenter sweeps (down then up) to reduce edge crossings.
 * 3. col = final index within the row.
 */
export const autoLayout: LayoutStrategy = (graph) => {
  const depths = computeDepths(graph)

  // Adjacency for the barycenter sweeps.
  const parentsOf = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
  for (const node of graph.nodes) {
    parentsOf.set(node.lessonId, [])
    childrenOf.set(node.lessonId, [])
  }
  for (const edge of graph.edges) {
    if (childrenOf.has(edge.from)) childrenOf.get(edge.from)!.push(edge.to)
    if (parentsOf.has(edge.to)) parentsOf.get(edge.to)!.push(edge.from)
  }

  const unitIndexOf = new Map(graph.nodes.map((n) => [n.lessonId, n.unitIndex]))

  // Group node ids by row (depth).
  const rows = new Map<number, string[]>()
  for (const node of graph.nodes) {
    const d = depths.get(node.lessonId) ?? 0
    if (!rows.has(d)) rows.set(d, [])
    rows.get(d)!.push(node.lessonId)
  }
  const rowKeys = [...rows.keys()].sort((a, b) => a - b)

  // Seed each row deterministically.
  for (const r of rowKeys) {
    rows.get(r)!.sort((a, b) => {
      const ua = unitIndexOf.get(a) ?? 0
      const ub = unitIndexOf.get(b) ?? 0
      if (ua !== ub) return ua - ub
      return a < b ? -1 : a > b ? 1 : 0
    })
  }

  // Current column index of each node within its row.
  const colIndex = new Map<string, number>()
  const reindex = () => {
    for (const r of rowKeys) {
      rows.get(r)!.forEach((id, i) => colIndex.set(id, i))
    }
  }
  reindex()

  // Median of neighbours' column indices (returns -1 when no neighbours, which
  // keeps the node anchored to its current spot during the sort).
  const median = (ids: string[]): number => {
    const cols = ids
      .map((id) => colIndex.get(id))
      .filter((c): c is number => c !== undefined)
      .sort((a, b) => a - b)
    if (cols.length === 0) return -1
    const mid = Math.floor(cols.length / 2)
    return cols.length % 2 === 1 ? cols[mid] : (cols[mid - 1] + cols[mid]) / 2
  }

  const sweep = (neighboursOf: Map<string, string[]>, order: number[]) => {
    for (const r of order) {
      const ids = rows.get(r)!
      const bary = new Map<string, number>()
      ids.forEach((id, i) => {
        const m = median(neighboursOf.get(id) ?? [])
        bary.set(id, m < 0 ? i : m) // no neighbours → keep position
      })
      ids.sort((a, b) => {
        const da = bary.get(a)!
        const db = bary.get(b)!
        if (da !== db) return da - db
        return a < b ? -1 : a > b ? 1 : 0 // stable, deterministic tiebreak
      })
      reindex()
    }
  }

  // A few alternating sweeps converge quickly for a graph this size.
  const topDown = [...rowKeys]
  const bottomUp = [...rowKeys].reverse()
  for (let pass = 0; pass < 4; pass += 1) {
    sweep(parentsOf, topDown) // align children under their parents
    sweep(childrenOf, bottomUp) // align parents over their children
  }

  const cellByNode = new Map<string, GridPosition>()
  for (const r of rowKeys) {
    rows.get(r)!.forEach((id, i) => cellByNode.set(id, { col: i, row: r }))
  }

  return assemble(graph, cellByNode)
}

/**
 * The strategy the app uses. Flip this to `autoLayout` to pivot the whole
 * Course Map to automatic layout — a one-line change, by design.
 */
export const layoutCourseGraph: LayoutStrategy = manualLayout
