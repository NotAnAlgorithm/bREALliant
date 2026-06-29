import type { KeyboardEvent, ReactElement } from 'react'

import type { GraphNodeStatus } from '../../lib/course-graph/types'

export interface LessonDetailPopoverProps {
  open: boolean
  onClose: () => void
  title: string
  status: GraphNodeStatus
  concepts: { retained: number; total: number } | null
  prerequisites: { lessonId: string; title: string; satisfied: boolean }[]
  recommended: boolean
  primaryLabel: string
  onPrimary: () => void
  onContinueAnyway?: () => void
}

const STATUS_META: Record<
  GraphNodeStatus,
  { label: string; tone: string; icon: 'check' | 'dot' | 'lock' }
> = {
  completed: { label: 'Completed', tone: 'text-brand', icon: 'check' },
  in_progress: { label: 'In progress', tone: 'text-amber-600', icon: 'dot' },
  unlocked: { label: 'Ready', tone: 'text-ink-muted', icon: 'dot' },
  locked: { label: 'Locked', tone: 'text-ink-muted', icon: 'lock' },
}

export function LessonDetailPopover({
  open,
  onClose,
  title,
  status,
  concepts,
  prerequisites,
  recommended,
  primaryLabel,
  onPrimary,
  onContinueAnyway,
}: LessonDetailPopoverProps): ReactElement | null {
  if (!open) return null

  const meta = STATUS_META[status]
  const isLocked = status === 'locked'
  const showConcepts = concepts != null && concepts.total > 0
  const masteryPct = showConcepts
    ? Math.round((concepts.retained / concepts.total) * 100)
    : 0
  const unsatisfied = prerequisites.filter((p) => !p.satisfied)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-detail-title"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface-elevated p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-2">
          {recommended ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
              <svg
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
                fill="currentColor"
                aria-hidden
              >
                <path d="M10 1.6l2.47 5 5.53.8-4 3.9.95 5.5L10 14.2l-4.95 2.6.95-5.5-4-3.9 5.53-.8L10 1.6z" />
              </svg>
              Recommended next
            </span>
          ) : null}
          <h2
            id="lesson-detail-title"
            className="text-lg font-semibold text-ink"
          >
            {title}
          </h2>
          <p className={`flex items-center gap-1.5 text-sm font-medium ${meta.tone}`}>
            <StatusIcon icon={meta.icon} />
            {meta.label}
          </p>
        </div>

        {showConcepts ? (
          <div className="space-y-1.5">
            <p className="text-sm text-ink-muted">
              <span className="font-medium text-ink">
                {concepts.retained}/{concepts.total}
              </span>{' '}
              concepts mastered
            </p>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-valuenow={concepts.retained}
              aria-valuemin={0}
              aria-valuemax={concepts.total}
            >
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${masteryPct}%` }}
              />
            </div>
          </div>
        ) : null}

        {prerequisites.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Prerequisites
            </p>
            <ul className="space-y-1.5">
              {prerequisites.map((prereq) => (
                <li
                  key={prereq.lessonId}
                  className="flex items-center gap-2 text-sm"
                >
                  <PrereqIcon satisfied={prereq.satisfied} />
                  <span
                    className={
                      prereq.satisfied ? 'text-ink' : 'text-ink-muted'
                    }
                  >
                    {prereq.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {isLocked ? (
          <p className="text-sm text-ink-muted">
            {unsatisfied.length > 0
              ? 'This lesson is locked until you finish its prerequisites. '
              : 'This lesson is locked. '}
            You can continue anyway, but it may be harder to follow.
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-elevated"
          >
            Close
          </button>
          {isLocked ? (
            onContinueAnyway ? (
              <button
                type="button"
                onClick={onContinueAnyway}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
              >
                Continue anyway
              </button>
            ) : null
          ) : (
            <button
              type="button"
              onClick={onPrimary}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
            >
              {primaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusIcon({ icon }: { icon: 'check' | 'dot' | 'lock' }) {
  if (icon === 'check') {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
          clipRule="evenodd"
        />
      </svg>
    )
  }

  if (icon === 'lock') {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M10 1a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4Zm2 6V5a2 2 0 1 0-4 0v2h4Z"
          clipRule="evenodd"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
      <circle cx="10" cy="10" r="4" />
    </svg>
  )
}

function PrereqIcon({ satisfied }: { satisfied: boolean }) {
  if (satisfied) {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-white"
        aria-hidden
      >
        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    )
  }

  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted"
      aria-hidden
    >
      <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 1a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4Zm2 6V5a2 2 0 1 0-4 0v2h4Z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  )
}
