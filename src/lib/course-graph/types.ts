/**
 * Course Map graph + layout types.
 *
 * These are the public contracts that the rest of the Course Map feature
 * (graph builder, layout strategies, and the eventual React renderer) depends
 * on. Keep them framework-agnostic: nothing in here may import React or touch
 * the DOM. Coordinates are plain numbers in a logical pixel space.
 */

/** Mirror of `LessonStatus` from `src/services/unlock.ts` (same string union). */
export type GraphNodeStatus = 'completed' | 'in_progress' | 'unlocked' | 'locked'

/** A single lesson, enriched with DAG metrics derived from the prereq graph. */
export interface CourseGraphNode {
  lessonId: string
  title: string
  unitId: string
  /** 0-based index of the lesson's unit in course order. */
  unitIndex: number
  tags: string[]
  prerequisites: string[]
  /** Number of lessons that list this lesson as a prerequisite. */
  outDegree: number
  /** True when `outDegree >= HUB_OUT_DEGREE` — a "hub" concept many things need. */
  isHub: boolean
}

/** A directed prerequisite edge: `from` must be learned before `to`. */
export interface CourseGraphEdge {
  /** The prerequisite lesson id. */
  from: string
  /** The dependent lesson id (the one that lists `from` as a prereq). */
  to: string
}

/** The pure logical graph, independent of any layout. */
export interface CourseGraph {
  nodes: CourseGraphNode[]
  edges: CourseGraphEdge[]
}

/** Logical grid coordinates — integers a human can read and hand-edit. */
export interface GridPosition {
  /** Column: spreads parallel branches left↔right. */
  col: number
  /** Row: increases downward, roughly tracking topological depth. */
  row: number
}

/** A node placed in pixel space (carries its grid coords too for debugging). */
export interface PositionedNode extends CourseGraphNode {
  col: number
  row: number
  /** Pixel center x. */
  x: number
  /** Pixel center y. */
  y: number
}

/** An edge resolved to concrete pixel anchor points plus a drawable SVG path. */
export interface PositionedEdge extends CourseGraphEdge {
  /** Anchor on the prerequisite node's boundary. */
  fromPoint: { x: number; y: number }
  /** Anchor on the dependent node's boundary. */
  toPoint: { x: number; y: number }
  /** SVG path `d` for a smooth curve from `fromPoint` to `toPoint`. */
  path: string
}

/** A fully laid-out graph ready to render into an SVG of `width` × `height`. */
export interface PositionedGraph {
  nodes: PositionedNode[]
  edges: PositionedEdge[]
  /** Logical canvas width in px. */
  width: number
  /** Logical canvas height in px. */
  height: number
}

/**
 * A layout strategy maps the logical graph to pixel space. Manual (hand-tuned)
 * and automatic (layered DAG) layouts both implement this single interface so
 * the app can swap strategies with a one-line change.
 */
export type LayoutStrategy = (graph: CourseGraph) => PositionedGraph
