/**
 * ─────────────────────────────────────────────────────────────────────────
 *  THE HAND-AUTHORED COURSE MAP
 * ─────────────────────────────────────────────────────────────────────────
 *
 * This file is THE knob a human turns to tune the Course Map. Everything here
 * is plain data: a map from `lessonId` → logical grid cell `{ col, row }`, plus
 * the spacing constants used to turn that grid into pixels.
 *
 * GRID CONVENTION
 * ---------------
 *   • `row` increases DOWNWARD and roughly tracks topological depth — i.e. how
 *     many prerequisites deep a lesson sits. Roots (no prereqs) are near row 0;
 *     the capstone is at the bottom.
 *   • `col` spreads PARALLEL BRANCHES left ↔ right. Lower col = further left.
 *     The Unit-1 "spine" lives around the center column; after the least-upper-
 *     bound hub the map FANS OUT, with the metric/topology track on the left
 *     and the sequences/series/analysis tracks on the right.
 *   • Hubs (lub, seq-limits, continuity) are placed centrally within their
 *     fan-out so their many outgoing edges splay symmetrically.
 *   • Coordinates are integers and every cell is unique (no two lessons share a
 *     cell). Edits should preserve both properties; the layout code does not
 *     de-duplicate manual cells for you.
 *
 * COLUMN LANES (informal — just a mental model, not enforced)
 * ----------------------------------------------------------
 *   col 0 ── deepest topology (compactness)
 *   col 1 ── metric→topology spine (open-closed, limit-points)
 *   col 2 ── metric track + a couple of left merges
 *   col 3 ── the Unit-1 central spine and the series column
 *   col 4 ── sequences hub + merges (seq-limits, monotone, evt, bw)
 *   col 5 ── sequences/diff column (subsequences, derivative, mvt, capstone)
 *   col 6 ── continuity hub column (function-limits, continuity, ivt, ftc)
 *   col 7 ── number-completeness offshoot (nth-roots) + integration (riemann)
 *
 * To add a future lesson, drop it in an empty cell here. Lessons you DON'T list
 * are auto-placed by the layout in a spare column, so forgetting one degrades
 * gracefully instead of breaking the map.
 */
import type { GridPosition } from './types'

export const MANUAL_POSITIONS: Record<string, GridPosition> = {
  // ── Unit 0: The Real & Complex Number Systems ───────────────────────────
  // A clean vertical spine down the center: each idea builds on the last,
  // culminating in the least-upper-bound property — the completeness hub the
  // entire course fans out from.
  'lesson-rationals-01': { col: 3, row: 0 }, // gaps in ℚ motivate everything
  'lesson-ordered-fields-01': { col: 3, row: 1 },
  'lesson-bounds-01': { col: 3, row: 2 }, // also feeds the Riemann integral later
  'lesson-lub-01': { col: 3, row: 3 }, // ★ HUB: completeness; the great fork

  // A short offshoot to the right of the spine: completeness "pays off" by
  // building nth roots and the Archimedean/density property. A dead-end branch.
  'lesson-nth-roots-01': { col: 7, row: 4 },
  'lesson-archimedean-01': { col: 7, row: 5 }, // leaf (out-degree 0)

  // ── Unit 1: Metric & Euclidean Spaces (LEFT fan) ────────────────────────
  // From lub we step into geometry: ℝⁿ → general metric spaces → balls. This
  // track runs down the left half of the map.
  'lesson-euclidean-01': { col: 2, row: 4 },
  'lesson-metric-spaces-01': { col: 2, row: 5 }, // also feeds sequences (right)
  'lesson-balls-nbhds-01': { col: 2, row: 6 },

  // ── Unit 2: Topology of Metric Spaces (far LEFT) ────────────────────────
  // open/closed splits into two sub-branches: limit-points→compactness, and
  // connectedness. These re-merge much later at EVT / IVT.
  'lesson-open-closed-01': { col: 1, row: 7 },
  'lesson-limit-points-01': { col: 1, row: 8 },
  'lesson-compactness-01': { col: 0, row: 9 }, // → EVT
  'lesson-connectedness-01': { col: 2, row: 8 }, // → IVT

  // ── Unit 3: Sequences & Convergence (RIGHT fan) ─────────────────────────
  // seq-limits is the second great hub (needs metric-spaces + lub). It fans
  // into the algebra of limits, subsequences, monotone, cauchy, and (downward)
  // function limits which opens the continuity track.
  'lesson-seq-limits-01': { col: 4, row: 6 }, // ★ HUB
  'lesson-limit-laws-01': { col: 6, row: 7 }, // leaf
  'lesson-subsequences-01': { col: 5, row: 7 },
  'lesson-monotone-01': { col: 4, row: 7 },
  'lesson-cauchy-01': { col: 3, row: 7 }, // completeness for sequences → series
  'lesson-bolzano-weierstrass-01': { col: 4, row: 8 }, // monotone + subsequences

  // ── Unit 4: Series (center-right column) ────────────────────────────────
  // A tidy vertical chain hanging off Cauchy completeness.
  'lesson-series-basics-01': { col: 3, row: 8 }, // also feeds pointwise/uniform
  'lesson-series-tests-01': { col: 3, row: 9 },
  'lesson-abs-conv-01': { col: 3, row: 10 }, // leaf

  // ── Unit 5: Continuity (RIGHT, third hub) ───────────────────────────────
  // function-limits → continuity, the third hub. Continuity fans into uniform
  // continuity, the two "great theorems" (EVT via compactness, IVT via
  // connectedness), the derivative, and pointwise/uniform convergence.
  'lesson-function-limits-01': { col: 6, row: 8 },
  'lesson-continuity-01': { col: 6, row: 9 }, // ★ HUB
  'lesson-uniform-continuity-01': { col: 7, row: 10 }, // → Riemann
  'lesson-evt-01': { col: 4, row: 10 }, // continuity + compactness merge
  'lesson-ivt-01': { col: 6, row: 10 }, // continuity + connectedness merge
  'lesson-derivative-01': { col: 5, row: 10 }, // → mvt, ftc, capstone

  // ── Unit 6: Differentiation (center-right) ──────────────────────────────
  'lesson-mvt-01': { col: 5, row: 11 }, // derivative + evt merge
  'lesson-taylor-01': { col: 5, row: 12 }, // leaf

  // ── Unit 7: The Riemann Integral (RIGHT) ────────────────────────────────
  'lesson-riemann-01': { col: 7, row: 11 }, // uniform-continuity + bounds merge
  'lesson-ftc-01': { col: 6, row: 12 }, // riemann + derivative merge

  // ── Unit 8: Sequences & Series of Functions (bottom, CAPSTONE) ──────────
  'lesson-pointwise-uniform-01': { col: 2, row: 10 }, // continuity + series-basics
  'lesson-uniform-preserve-01': { col: 5, row: 13 }, // ★ capstone: pointwise + riemann + derivative
}

/**
 * Spacing + sizing for turning grid cells into pixels. Tweak freely; these are
 * deliberately generous so hub fan-outs don't crowd.
 */
export const GRID = {
  /**
   * Horizontal distance between adjacent columns, in px. Sized so two wrapped,
   * 2-line labels in side-by-side columns (≤16 chars/line at fontSize 16 ≈
   * 145px wide) never collide horizontally — labels sit centered under nodes.
   */
  colGap: 156,
  /**
   * Vertical distance between adjacent rows, in px. Leaves room for a node
   * (hub radius 50 + spotlight) plus a 2-line label hanging below it before the
   * next row begins, so larger nodes/labels don't overlap downward.
   */
  rowGap: 165,
  /** Left/right canvas padding, in px. */
  marginX: 70,
  /** Top/bottom canvas padding, in px. */
  marginY: 60,
  /** Radius of a lesson node circle, in px (used to anchor edges on borders). */
  nodeRadius: 40,
} as const
