import { useMemo } from 'react'

import type { WidgetComponentProps } from '../types'
import { RichText } from '../../components/blocks/RichText'
import { orderOptionsForDisplay } from '../shuffle'
import { parseMultipleChoiceProps } from './utils'

export function MultipleChoiceWidget({
  widget,
  state,
  onStateChange,
  disabled = false,
}: WidgetComponentProps) {
  const { choices } = parseMultipleChoiceProps(widget.props)
  const selectedId = typeof state.selectedId === 'string' ? state.selectedId : ''

  // Scramble display order once per presentation. Keyed by the option-id set so
  // it does not reshuffle on every re-render (only when a new question loads).
  const choiceKey = choices.map((c) => c.id).join('|')
  const ordered = useMemo(
    () => orderOptionsForDisplay(choices, widget.props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [choiceKey],
  )

  return (
    <div
      className="flex flex-col gap-2"
      role="radiogroup"
      data-widget="multiple_choice"
    >
      {ordered.map((choice) => {
        const selected = choice.id === selectedId
        return (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onStateChange({ selectedId: choice.id })}
            className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              selected
                ? 'border-brand bg-brand/10 text-ink'
                : 'border-border bg-surface-elevated text-ink hover:border-brand/40'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                selected ? 'border-brand' : 'border-ink-muted/50'
              }`}
            >
              {selected ? (
                <span className="h-2.5 w-2.5 rounded-full bg-brand" />
              ) : null}
            </span>
            <RichText content={choice.label} className="text-sm" />
          </button>
        )
      })}
    </div>
  )
}
