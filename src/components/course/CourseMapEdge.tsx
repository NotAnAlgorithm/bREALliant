import { memo } from 'react'

import type {
  GraphNodeStatus,
  PositionedEdge,
} from '../../lib/course-graph/types'

export interface CourseMapEdgeProps {
  edge: PositionedEdge
  /** Status of the dependent (`to`) node — drives the edge's emphasis. */
  toStatus: GraphNodeStatus
}

/**
 * A single prerequisite edge. Edges feeding an already-reachable lesson read as
 * solid brand strokes; edges feeding a still-locked lesson fade to a faint
 * dashed line so the "live" frontier of the course stands out.
 */
export const CourseMapEdge = memo(function CourseMapEdge({
  edge,
  toStatus,
}: CourseMapEdgeProps) {
  const locked = toStatus === 'locked'

  return (
    <path
      d={edge.path}
      fill="none"
      stroke={locked ? 'var(--color-ink-muted)' : 'var(--color-brand)'}
      strokeWidth={locked ? 2.75 : 3.5}
      strokeLinecap="round"
      strokeDasharray={locked ? '6 8' : undefined}
      opacity={locked ? 0.6 : 0.9}
      markerEnd={locked ? 'url(#course-map-arrow-locked)' : 'url(#course-map-arrow)'}
      data-testid="course-map-edge"
      data-edge-locked={locked ? 'true' : 'false'}
    />
  )
})
