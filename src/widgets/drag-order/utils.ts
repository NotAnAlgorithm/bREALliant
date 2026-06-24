export type DragOrderItem = {
  id: string
  label: string
}

export type DragOrderState = {
  order: string[]
}

export function parseDragOrderProps(props: Record<string, unknown>): {
  items: DragOrderItem[]
} {
  const raw = Array.isArray(props.items) ? props.items : []
  const items = raw.flatMap((entry) => {
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
  return { items }
}
