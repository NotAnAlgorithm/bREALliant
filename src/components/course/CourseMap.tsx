import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import './CourseMap.css'

import { useCourseGraph } from '../../hooks/useCourseGraph'
import { loadCourse } from '../../lib/content/schema-loader'
import type { GraphNodeStatus } from '../../lib/course-graph/types'
import { CourseMapEdge } from './CourseMapEdge'
import { CourseMapNode } from './CourseMapNode'
import { LessonDetailPopover } from './LessonDetailPopover'

const MIN_ZOOM = 0.4
const MAX_ZOOM = 2.5
const ZOOM_STEP = 1.25

/**
 * The default view shows a horizontal WINDOW of the (very tall) graph: its full
 * width and a band of height = width × VIEW_ASPECT. Because the viewBox is wider
 * than it is tall (aspect ≈ 1.5) and `preserveAspectRatio="…meet"` fits it into
 * the short, wide container, the graph fills the available WIDTH and is explored
 * by panning vertically — instead of zooming the whole tall graph out to a tiny
 * overview. This is pure viewBox math (no DOM measurement), so it scales from a
 * narrow phone to a wide laptop identically.
 */
const VIEW_ASPECT = 0.66
/** Pull the default window slightly above y=0 so the first unit label shows. */
const TOP_INSET = 28

const PRIMARY_LABEL: Record<GraphNodeStatus, string> = {
  completed: 'Review',
  in_progress: 'Resume',
  unlocked: 'Start',
  locked: 'Start',
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/** Zoom + center expressed in logical graph coordinates (no DOM measuring). */
interface Camera {
  zoom: number
  cx: number
  cy: number
}

export function CourseMap() {
  const navigate = useNavigate()
  const {
    graph,
    statusById,
    conceptsById,
    recommendedLessonId,
    satisfiedIds,
    titleById,
  } = useCourseGraph()

  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.lessonId, node])),
    [graph.nodes],
  )

  // Unit clusters: a soft label near the top of each unit's node group. Keeps
  // the map oriented without the noise of full background bands.
  const unitClusters = useMemo(() => {
    const course = loadCourse()
    const byUnit = new Map<
      number,
      { minX: number; maxX: number; minY: number }
    >()
    for (const node of graph.nodes) {
      const cur = byUnit.get(node.unitIndex)
      if (!cur) {
        byUnit.set(node.unitIndex, {
          minX: node.x,
          maxX: node.x,
          minY: node.y,
        })
      } else {
        cur.minX = Math.min(cur.minX, node.x)
        cur.maxX = Math.max(cur.maxX, node.x)
        cur.minY = Math.min(cur.minY, node.y)
      }
    }
    return [...byUnit.entries()]
      .map(([unitIndex, box]) => ({
        unitIndex,
        title: course.units[unitIndex]?.title ?? '',
        x: (box.minX + box.maxX) / 2,
        y: box.minY,
      }))
      .filter((cluster) => cluster.title !== '')
      .sort((a, b) => a.unitIndex - b.unitIndex)
  }, [graph.nodes])

  // Default camera: centered on the graph's width, anchored near its top. At
  // zoom 1 the viewBox is exactly `graph.width` wide, so the map fills the
  // container width; `cy` puts the top band (first units) into view.
  const defaultView = useMemo<Camera>(() => {
    const viewH = graph.width * VIEW_ASPECT
    return {
      zoom: 1,
      cx: graph.width / 2,
      cy: viewH / 2 - TOP_INSET,
    }
  }, [graph.width])

  const [camera, setCamera] = useState<Camera>(defaultView)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panning, setPanning] = useState(false)

  const svgRef = useRef<SVGSVGElement | null>(null)
  // Active pointers for pan/pinch, tracked in refs to avoid re-renders.
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null)

  const viewBox = useMemo(() => {
    // The window is full-width × (width × VIEW_ASPECT), then scaled by zoom.
    // Decoupling the viewBox height from `graph.height` is what lets the tall
    // graph fill the container's WIDTH rather than fit-to-height and shrink.
    const w = graph.width / camera.zoom
    const h = (graph.width * VIEW_ASPECT) / camera.zoom
    const x = camera.cx - w / 2
    const y = camera.cy - h / 2
    return `${x} ${y} ${w} ${h}`
  }, [camera, graph.width])

  const zoomBy = useCallback((factor: number) => {
    setCamera((cam) => ({
      ...cam,
      zoom: clamp(cam.zoom * factor, MIN_ZOOM, MAX_ZOOM),
    }))
  }, [])

  const recenter = useCallback(() => {
    setCamera(defaultView)
  }, [defaultView])

  const onWheel = useCallback(
    (event: ReactWheelEvent<SVGSVGElement>) => {
      event.preventDefault()
      zoomBy(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP)
    },
    [zoomBy],
  )

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      // Don't hijack activation of focusable nodes.
      const target = event.target as Element
      if (target.closest('.course-map-node')) return

      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      })
      event.currentTarget.setPointerCapture?.(event.pointerId)

      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()]
        pinchRef.current = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          zoom: camera.zoom,
        }
      } else {
        setPanning(true)
      }
    },
    [camera.zoom],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const prev = pointers.current.get(event.pointerId)
      if (!prev) return
      const next = { x: event.clientX, y: event.clientY }
      pointers.current.set(event.pointerId, next)

      // Pinch zoom: ratio of finger distance is unit-free (no DOM measuring).
      if (pointers.current.size === 2 && pinchRef.current) {
        const [a, b] = [...pointers.current.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchRef.current.dist > 0) {
          const ratio = dist / pinchRef.current.dist
          setCamera((cam) => ({
            ...cam,
            zoom: clamp(pinchRef.current!.zoom * ratio, MIN_ZOOM, MAX_ZOOM),
          }))
        }
        return
      }

      // Drag pan: convert screen delta to graph units via the current scale.
      const svg = svgRef.current
      const rect = svg?.getBoundingClientRect()
      const widthPx = rect?.width ?? 0
      const heightPx = rect?.height ?? 0
      if (widthPx <= 0 || heightPx <= 0) return

      // Match the viewBox dimensions exactly so 1px of drag moves the graph by
      // 1px on screen (the viewBox height is width-derived, not graph.height).
      const w = graph.width / camera.zoom
      const h = (graph.width * VIEW_ASPECT) / camera.zoom
      const dxGraph = ((next.x - prev.x) * w) / widthPx
      const dyGraph = ((next.y - prev.y) * h) / heightPx
      setCamera((cam) => ({ ...cam, cx: cam.cx - dxGraph, cy: cam.cy - dyGraph }))
    },
    [camera.zoom, graph.width],
  )

  const endPointer = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      pointers.current.delete(event.pointerId)
      if (pointers.current.size < 2) pinchRef.current = null
      if (pointers.current.size === 0) setPanning(false)
    },
    [],
  )

  const openLesson = useCallback(
    (lessonId: string, bypassPrereqGate = false) =>
      navigate(
        `/lesson/${lessonId}`,
        bypassPrereqGate ? { state: { bypassPrereqGate: true } } : undefined,
      ),
    [navigate],
  )

  const selectedNode = selectedId ? nodeById.get(selectedId) : undefined
  const selectedStatus: GraphNodeStatus = selectedId
    ? statusById.get(selectedId) ?? 'locked'
    : 'locked'

  const selectedConcepts = (() => {
    if (!selectedId) return null
    const c = conceptsById.get(selectedId)
    return c && c.total > 0 ? c : null
  })()

  const selectedPrereqs = selectedNode
    ? selectedNode.prerequisites.map((prereqId) => ({
        lessonId: prereqId,
        title: titleById.get(prereqId) ?? prereqId,
        satisfied: satisfiedIds.has(prereqId),
      }))
    : []

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
        <div
          className="course-map relative h-[70vh] min-h-[520px] w-full"
          data-panning={panning ? 'true' : 'false'}
          data-testid="course-map"
        >
          <svg
            ref={svgRef}
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            role="group"
            aria-label="Course map — prerequisite graph of lessons"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
          >
            <defs>
              <marker
                id="course-map-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="4.5"
                markerHeight="4.5"
                orient="auto-start-reverse"
              >
                <path d="M0 0 L10 5 L0 10 z" fill="var(--color-brand)" opacity={0.9} />
              </marker>
              <marker
                id="course-map-arrow-locked"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="4.5"
                markerHeight="4.5"
                orient="auto-start-reverse"
              >
                <path d="M0 0 L10 5 L0 10 z" fill="var(--color-ink-muted)" opacity={0.7} />
              </marker>
            </defs>

            {/* Soft unit labels behind everything. */}
            <g aria-hidden>
              {unitClusters.map((cluster) => (
                <text
                  key={cluster.unitIndex}
                  x={cluster.x}
                  y={cluster.y - 72}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={700}
                  letterSpacing={0.7}
                  fill="var(--color-ink-muted)"
                  opacity={0.5}
                  style={{ textTransform: 'uppercase' }}
                >
                  {cluster.title}
                </text>
              ))}
            </g>

            {/* Edges first so nodes sit on top. */}
            <g data-testid="course-map-edges">
              {graph.edges.map((edge) => (
                <CourseMapEdge
                  key={`${edge.from}->${edge.to}`}
                  edge={edge}
                  toStatus={statusById.get(edge.to) ?? 'locked'}
                />
              ))}
            </g>

            {/* Nodes. */}
            <g data-testid="course-map-nodes">
              {graph.nodes.map((node) => (
                <CourseMapNode
                  key={node.lessonId}
                  node={node}
                  status={statusById.get(node.lessonId) ?? 'locked'}
                  concepts={
                    conceptsById.get(node.lessonId) ?? { retained: 0, total: 0 }
                  }
                  recommended={node.lessonId === recommendedLessonId}
                  selected={node.lessonId === selectedId}
                  onSelect={() => setSelectedId(node.lessonId)}
                />
              ))}
            </g>
          </svg>

          <MapControls
            onZoomIn={() => zoomBy(ZOOM_STEP)}
            onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
            onRecenter={recenter}
          />
          <MapLegend />
        </div>
      </div>

      {selectedId && selectedNode ? (
        <LessonDetailPopover
          open
          onClose={() => setSelectedId(null)}
          title={selectedNode.title}
          status={selectedStatus}
          concepts={selectedConcepts}
          prerequisites={selectedPrereqs}
          recommended={selectedId === recommendedLessonId}
          primaryLabel={PRIMARY_LABEL[selectedStatus]}
          onPrimary={() => openLesson(selectedId)}
          onContinueAnyway={
            selectedStatus === 'locked'
              ? () => openLesson(selectedId, true)
              : undefined
          }
        />
      ) : null}
    </div>
  )
}

function MapControls({
  onZoomIn,
  onZoomOut,
  onRecenter,
}: {
  onZoomIn: () => void
  onZoomOut: () => void
  onRecenter: () => void
}) {
  const btn =
    'flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-elevated text-ink shadow-sm transition-colors hover:border-brand/40 hover:text-brand'
  return (
    <div className="absolute right-3 top-3 flex flex-col gap-1.5">
      <button type="button" onClick={onZoomIn} aria-label="Zoom in" className={btn}>
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M9 4a1 1 0 0 1 2 0v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4Z" />
        </svg>
      </button>
      <button type="button" onClick={onZoomOut} aria-label="Zoom out" className={btn}>
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M4 9h12a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2Z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onRecenter}
        aria-label="Recenter map"
        className={btn}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm1-6a1 1 0 1 0-2 0v1.06A6.002 6.002 0 0 0 4.06 9H3a1 1 0 0 0 0 2h1.06A6.002 6.002 0 0 0 9 15.94V17a1 1 0 1 0 2 0v-1.06A6.002 6.002 0 0 0 15.94 11H17a1 1 0 1 0 0-2h-1.06A6.002 6.002 0 0 0 11 4.06V3Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  )
}

function MapLegend() {
  const items: { label: string; swatch: ReactNode }[] = [
    {
      label: 'Completed',
      swatch: <span className="h-3 w-3 rounded-full bg-brand" />,
    },
    {
      label: 'In progress',
      swatch: (
        <span className="h-3 w-3 rounded-full border-2 border-amber-500" />
      ),
    },
    {
      label: 'Ready',
      swatch: <span className="h-3 w-3 rounded-full border-2 border-brand" />,
    },
    {
      label: 'Locked',
      swatch: (
        <span className="h-3 w-3 rounded-full border-2 border-border bg-surface" />
      ),
    },
    {
      label: 'Concepts mastered',
      swatch: (
        <span className="h-3 w-3 rounded-full border-2 border-success" />
      ),
    },
    {
      label: 'Recommended',
      swatch: (
        <span className="h-3 w-3 rounded-full bg-brand/30 ring-2 ring-brand/40" />
      ),
    },
  ]
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 max-w-[10rem] rounded-lg border border-border bg-surface-elevated/90 p-2.5 text-xs shadow-sm backdrop-blur">
      <p className="mb-1.5 font-semibold text-ink">Legend</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-ink-muted">
            <span className="flex h-3 w-3 shrink-0 items-center justify-center">
              {item.swatch}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
