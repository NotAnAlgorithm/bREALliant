export type MultipleSelectChoice = {
  id: string
  label: string
}

export type MultipleSelectState = {
  selectedIds: string[]
}

export function parseMultipleSelectProps(props: Record<string, unknown>): {
  choices: MultipleSelectChoice[]
  selectAllHint?: string
} {
  const raw = Array.isArray(props.choices) ? props.choices : []
  const choices = raw.flatMap((entry) => {
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
  const selectAllHint =
    typeof props.selectAllHint === 'string' ? props.selectAllHint : undefined
  return { choices, selectAllHint }
}
