import type { WidgetKind } from '@content/schemas/widgets'

import type { WidgetComponentProps } from './types'
import { widgetRegistry } from './widget-registry'

type WidgetRendererProps = WidgetComponentProps & {
  kind: WidgetKind
}

export function WidgetRenderer({ kind, ...props }: WidgetRendererProps) {
  const Component = widgetRegistry[kind]

  if (!Component) {
    return (
      <div
        className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-ink-muted"
        data-widget-kind={kind}
      >
        Widget <code className="font-mono">{kind}</code> not implemented yet.
      </div>
    )
  }

  return <Component {...props} />
}
