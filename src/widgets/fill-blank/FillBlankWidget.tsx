import type { WidgetComponentProps } from '../types'
import { LatexFragment } from '../../components/blocks/LatexFragment'
import {
  parseFillBlankProps,
  splitTemplate,
  type FillBlankState,
} from './utils'

export function FillBlankWidget({
  widget,
  state,
  onStateChange,
  disabled = false,
}: WidgetComponentProps) {
  const props = parseFillBlankProps(widget.props)
  const answer = typeof state.answer === 'string' ? state.answer : ''
  const [before, after] = splitTemplate(props.template ?? '{{answer}}')

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-1 rounded-xl border border-border bg-surface-elevated px-4 py-4 sm:gap-2"
      data-widget="fill_blank"
    >
      {before ? <LatexFragment latex={before} /> : null}

      <input
        type="text"
        inputMode="decimal"
        value={answer}
        disabled={disabled}
        placeholder={props.placeholder}
        aria-label="Your answer"
        onChange={(event) =>
          onStateChange({ answer: event.target.value } satisfies FillBlankState)
        }
        className="min-h-11 w-16 min-w-[4rem] shrink-0 rounded-lg border border-border bg-white px-3 py-2 text-center font-mono text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
      />

      {after ? <LatexFragment latex={after} /> : null}
    </div>
  )
}
