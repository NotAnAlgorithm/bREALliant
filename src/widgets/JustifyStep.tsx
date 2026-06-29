import { useMemo } from 'react'

import type { WidgetComponentProps } from './types'
import { RichText } from '../components/blocks/RichText'
import { orderOptionsForDisplay } from './shuffle'

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
  const { steps, justifications } = parseProps(widget.props)
  // The proof steps are an ordered argument (kept as authored), but the shared
  // justification options have no inherent order, so scramble their display.
  const justKey = justifications.map((j) => j.id).join('|')
  const shuffledJustifications = useMemo(
    () => orderOptionsForDisplay(justifications, widget.props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [justKey],
  )
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
        const current =
          typeof matches[step.id] === 'string'
            ? (matches[step.id] as string)
            : ''
        return (
          <li
            key={step.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <span className="font-mono text-sm text-ink-muted">
                {index + 1}.
              </span>
              <RichText content={step.label} className="text-sm text-ink" />
            </div>
            <div
              role="radiogroup"
              aria-label={`Justification for step ${index + 1}`}
              className="flex flex-col gap-2"
            >
              {shuffledJustifications.map((justification) => {
                const selected = current === justification.id
                return (
                  <button
                    key={justification.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={disabled}
                    onClick={() => handleChange(step.id, justification.id)}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected
                        ? 'border-brand bg-brand/10 text-ink'
                        : 'border-border bg-surface text-ink hover:border-brand/40'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        selected ? 'border-brand' : 'border-ink-muted/50'
                      }`}
                    >
                      {selected ? (
                        <span className="h-2 w-2 rounded-full bg-brand" />
                      ) : null}
                    </span>
                    <RichText content={justification.label} className="text-sm" />
                  </button>
                )
              })}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
