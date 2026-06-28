import { useId } from 'react'

import type { WidgetComponentProps } from './types'
import { RichText } from '../components/blocks/RichText'

type ProofStep = {
  id: string
  label: string
}

type Justification = {
  id: string
  label: string
}

function parseEntries(value: unknown): { id: string; label: string }[] {
  const raw = Array.isArray(value) ? value : []
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const candidate = entry as { id?: unknown; label?: unknown }
    if (typeof candidate.id !== 'string') return []
    return [
      {
        id: candidate.id,
        label: typeof candidate.label === 'string' ? candidate.label : '',
      },
    ]
  })
}

function parseProps(props: Record<string, unknown>): {
  steps: ProofStep[]
  justifications: Justification[]
} {
  return {
    steps: parseEntries(props.steps),
    justifications: parseEntries(props.justifications),
  }
}

export function JustifyStep({
  widget,
  state,
  onStateChange,
  disabled = false,
}: WidgetComponentProps) {
  const baseId = useId()
  const { steps, justifications } = parseProps(widget.props)
  const matches =
    state.matches && typeof state.matches === 'object'
      ? (state.matches as Record<string, unknown>)
      : {}

  const handleChange = (stepId: string, justId: string) => {
    const next: Record<string, string> = {}
    for (const [key, value] of Object.entries(matches)) {
      next[key] = typeof value === 'string' ? value : ''
    }
    next[stepId] = justId
    onStateChange({ matches: next })
  }

  return (
    <ol className="flex flex-col gap-3" data-widget="justify_step">
      {steps.map((step, index) => {
        const selectId = `${baseId}-${step.id}`
        const current =
          typeof matches[step.id] === 'string'
            ? (matches[step.id] as string)
            : ''
        return (
          <li
            key={step.id}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <span className="font-mono text-sm text-ink-muted">
                {index + 1}.
              </span>
              <RichText content={step.label} className="text-sm text-ink" />
            </div>
            <label htmlFor={selectId} className="sr-only">
              Justification for step {index + 1}
            </label>
            <select
              id={selectId}
              value={current}
              disabled={disabled}
              onChange={(event) => handleChange(step.id, event.target.value)}
              className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink transition-colors hover:border-brand/40 focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Choose a justification…</option>
              {justifications.map((justification) => (
                <option key={justification.id} value={justification.id}>
                  {justification.label}
                </option>
              ))}
            </select>
          </li>
        )
      })}
    </ol>
  )
}
