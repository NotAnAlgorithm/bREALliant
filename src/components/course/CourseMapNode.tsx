import { memo, type KeyboardEvent } from 'react'

import { GRID } from '../../lib/course-graph/manual-layout'
import type {
  GraphNodeStatus,
  PositionedNode,
} from '../../lib/course-graph/types'
import type { ConceptProgress } from '../../hooks/useCourseGraph'

const AMBER = '#f59e0b'

const STATUS_LABEL: Record<GraphNodeStatus, string> = {
  completed: 'Completed',
  in_progress: 'In progress',
  unlocked: 'Ready',
  locked: 'Locked',
}

/** Hubs get a slightly larger circle so the "many things need this" reads. */
const HUB_SCALE = 1.25
/** Mastery ring sits just outside the node body. */
const RING_GAP = 6
const RING_WIDTH = 4

/** Label typography. Tuned for legibility once the map fills the viewport width. */
const LABEL_FONT_SIZE = 16
/** Max characters per wrapped label line (deterministic — no DOM measuring). */
const LABEL_MAX_CHARS = 16
/** Max wrapped lines before we ellipsize; keeps every label ≤ 2 lines tall. */
const LABEL_MAX_LINES = 2
/** Baseline distance between wrapped label lines, in px. */
const LABEL_LINE_HEIGHT = 19
/** Gap from the node/ring edge to the FIRST label baseline, in px. */
const LABEL_TOP_GAP = 20

export interface CourseMapNodeProps {
  node: PositionedNode
  status: GraphNodeStatus
  concepts: ConceptProgress
  recommended: boolean
  selected: boolean
  onSelect: () => void
}

/** Append an ellipsis to `s`, trimming so the result still fits `maxChars`. */
function ellipsize(s: string, maxChars: number): string {
  if (s.length < maxChars) return `${s}…`
  return `${s.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
}

/**
 * Greedy word-wrap into lines of at most `maxChars`. A single word longer than
 * the budget is hard-broken. Purely string math — deterministic and DOM-free so
 * jsdom tests stay stable (no getBBox / getBoundingClientRect).
 */
function wrapWords(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (word.length > maxChars) {
      if (line) lines.push(line)
      let rest = word
      while (rest.length > maxChars) {
        lines.push(rest.slice(0, maxChars))
        rest = rest.slice(maxChars)
      }
      line = rest
      continue
    }
    const candidate = line ? `${line} ${word}` : word
    if (candidate.length <= maxChars) {
      line = candidate
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

/**
 * Wrap a title into at most `maxLines` lines of `maxChars`, ellipsizing the last
 * line when the title doesn't fit. The FULL untruncated title still lives in the
 * node's `aria-label`; this only governs the visible glyphs.
 */
// Exported only so the deterministic wrapping can be unit-tested directly. It is
// a pure string helper (no DOM), kept beside the sole consumer; the repo can't
// add a new module here, so we opt this one export out of the component-only rule.
// eslint-disable-next-line react-refresh/only-export-components
export function wrapLabel(
  text: string,
  maxChars = LABEL_MAX_CHARS,
  maxLines = LABEL_MAX_LINES,
): string[] {
  const all = wrapWords(text, maxChars)
  if (all.length <= maxLines) return all
  const clipped = all.slice(0, maxLines)
  clipped[maxLines - 1] = ellipsize(clipped[maxLines - 1], maxChars)
  return clipped
}

export const CourseMapNode = memo(function CourseMapNode({
  node,
  status,
  concepts,
  recommended,
  selected,
  onSelect,
}: CourseMapNodeProps) {
  const radius = GRID.nodeRadius * (node.isHub ? HUB_SCALE : 1)
  const isLocked = status === 'locked'

  const label = STATUS_LABEL[status]
  const ariaLabel =
    concepts.total > 0
      ? `${node.title} — ${label}, ${concepts.retained}/${concepts.total} concepts`
      : `${node.title} — ${label}`

  // Visible glyphs only; aria-label above keeps the full, untruncated title.
  const labelLines = wrapLabel(node.title)

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      onSelect()
    }
  }

  // Mastery ring geometry: a circle whose stroke is "spent" to reveal a fraction
  // of the circumference, drawn from 12 o'clock clockwise. Hidden for locked.
  const ringRadius = radius + RING_GAP
  const circumference = 2 * Math.PI * ringRadius
  const fraction = concepts.total > 0 ? concepts.retained / concepts.total : 0
  const showRing = !isLocked && concepts.total > 0

  return (
    <g
      className="course-map-node"
      transform={`translate(${node.x} ${node.y})`}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      data-testid="course-map-node"
      data-lesson-id={node.lessonId}
      data-status={status}
      data-recommended={recommended ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      {/* Recommended spotlight: a soft, pulsing halo behind everything. */}
      {recommended ? (
        <circle
          className="course-map-spotlight"
          r={radius + 14}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth={3}
          data-testid="course-map-recommended"
        />
      ) : null}

      {/* Focus / selection indicator ring. */}
      <circle
        className="course-map-node-focus"
        r={radius + RING_GAP + 4}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth={2}
        opacity={selected ? 0.9 : 0}
      />

      <g className="course-map-node-body" opacity={isLocked ? 0.55 : 1}>
        {/* Mastery ring track + progress arc. */}
        {showRing ? (
          <>
            <circle
              r={ringRadius}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={RING_WIDTH}
              opacity={0.6}
            />
            <circle
              r={ringRadius}
              fill="none"
              stroke="var(--color-success)"
              strokeWidth={RING_WIDTH}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - fraction)}
              transform="rotate(-90)"
              data-testid="course-map-mastery-ring"
              data-fraction={fraction.toFixed(2)}
            />
          </>
        ) : null}

        {/* Node body. */}
        <NodeBody radius={radius} status={status} />

        {/* Status glyph. */}
        <StatusGlyph radius={radius} status={status} />
      </g>

      {/* Lesson label with a surface-colored halo for contrast over edges.
          The full title lives in aria-label; here it wraps to ≤2 lines. */}
      <text
        x={0}
        y={radius + RING_GAP + LABEL_TOP_GAP}
        textAnchor="middle"
        className="course-map-node-label"
        fontSize={LABEL_FONT_SIZE}
        fontWeight={600}
        fill={isLocked ? 'var(--color-ink-muted)' : 'var(--color-ink)'}
        stroke="var(--color-surface)"
        strokeWidth={4}
        paintOrder="stroke"
        style={{ pointerEvents: 'none' }}
        aria-hidden
      >
        {labelLines.map((line, index) => (
          <tspan
            key={`${line}-${index}`}
            x={0}
            dy={index === 0 ? 0 : LABEL_LINE_HEIGHT}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  )
})

function NodeBody({
  radius,
  status,
}: {
  radius: number
  status: GraphNodeStatus
}) {
  if (status === 'completed') {
    return <circle r={radius} fill="var(--color-brand)" />
  }
  if (status === 'locked') {
    return (
      <circle
        r={radius}
        fill="var(--color-surface)"
        stroke="var(--color-border)"
        strokeWidth={3}
      />
    )
  }
  const ringColor = status === 'in_progress' ? AMBER : 'var(--color-brand)'
  return (
    <circle
      r={radius}
      fill="var(--color-surface-elevated)"
      stroke={ringColor}
      strokeWidth={3.5}
    />
  )
}

function StatusGlyph({
  radius,
  status,
}: {
  radius: number
  status: GraphNodeStatus
}) {
  const size = radius * 0.95
  const half = size / 2

  if (status === 'completed') {
    return (
      <svg x={-half} y={-half} width={size} height={size} viewBox="0 0 20 20" aria-hidden>
        <path
          fill="#ffffff"
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
          clipRule="evenodd"
        />
      </svg>
    )
  }

  if (status === 'locked') {
    return (
      <svg x={-half} y={-half} width={size} height={size} viewBox="0 0 20 20" aria-hidden>
        <path
          fill="var(--color-ink-muted)"
          fillRule="evenodd"
          d="M10 1a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4Zm2 6V5a2 2 0 1 0-4 0v2h4Z"
          clipRule="evenodd"
        />
      </svg>
    )
  }

  // unlocked / in_progress: a small filled dot in the accent color.
  const dotColor = status === 'in_progress' ? AMBER : 'var(--color-brand)'
  return <circle r={Math.max(3, radius * 0.18)} fill={dotColor} />
}
