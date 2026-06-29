import { useMemo } from 'react'

import type { WidgetComponentProps } from '../types'
import { RichText } from '../../components/blocks/RichText'
import { orderOptionsForDisplay } from '../shuffle'
import { parseMultipleSelectProps } from './utils'

export function MultipleSelectWidget({
  widget,
  state,
  onStateChange,
  disabled = false,
}: WidgetComponentProps) {
  const { choices, selectAllHint } = parseMultipleSelectProps(widget.props)
  const selectedIds = Array.isArray(state.selectedIds)
    ? state.selectedIds.filter((id): id is string => typeof id === 'string')
    : []
  const selectedSet = new Set(selectedIds)

  // Scramble display order once per presentation (keyed by the option-id set);
  // selection state is by id, so order never affects the canonical answer.
  const choiceKey = choices.map((c) => c.id).join('|')
  const ordered = useMemo(
    () => orderOptionsForDisplay(choices, widget.props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [choiceKey],
  )

  function toggle(id: string) {
    const next = new Set(selectedSet)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onStateChange({ selectedIds: [...next].sort() })
  }

  return (
    <div className="flex flex-col gap-2" role="group" data-widget="multiple_select">
      <p className="text-xs text-ink-muted">
        {selectAllHint ?? 'Select all that apply.'}
      </p>
      {ordered.map((choice) => {
        const selected = selectedSet.has(choice.id)
        return (
          <button
            key={choice.id}
            type="button"
            role="checkbox"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => toggle(choice.id)}
            className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              selected
                ? 'border-brand bg-brand/10 text-ink'
                : 'border-border bg-surface-elevated text-ink hover:border-brand/40'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                selected ? 'border-brand bg-brand/20' : 'border-ink-muted/50'
              }`}
            >
              {selected ? (
                <span className="h-2.5 w-2.5 rounded-sm bg-brand" />
              ) : null}
            </span>
            <RichText content={choice.label} className="text-sm" />
          </button>
        )
      })}
    </div>
  )
}
