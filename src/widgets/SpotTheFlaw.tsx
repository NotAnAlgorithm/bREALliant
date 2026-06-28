import type { WidgetComponentProps } from './types'
import { RichText } from '../components/blocks/RichText'

type ProofStep = {
  id: string
  label: string
}

function parseSteps(props: Record<string, unknown>): ProofStep[] {
  const raw = Array.isArray(props.steps) ? props.steps : []
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

export function SpotTheFlaw({
  widget,
  state,
  onStateChange,
  disabled = false,
}: WidgetComponentProps) {
  const steps = parseSteps(widget.props)
  const selectedId = typeof state.selectedId === 'string' ? state.selectedId : ''

  return (
    <ol
      className="flex flex-col gap-2"
      role="radiogroup"
      aria-label="Select the flawed proof step"
      data-widget="spot_the_flaw"
    >
      {steps.map((step, index) => {
        const selected = step.id === selectedId
        return (
          <li key={step.id}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onStateChange({ selectedId: step.id })}
              className={`flex min-h-11 w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? 'border-brand bg-brand/10 text-ink'
                  : 'border-border bg-surface-elevated text-ink hover:border-brand/40'
              }`}
            >
              <span className="font-mono text-sm text-ink-muted">
                {index + 1}.
              </span>
              <RichText content={step.label} className="text-sm" />
            </button>
          </li>
        )
      })}
    </ol>
  )
}
