export type MultipleChoiceChoice = {
  id: string
  label: string
}

export type MultipleChoiceState = {
  selectedId: string
}

export function parseMultipleChoiceProps(props: Record<string, unknown>): {
  choices: MultipleChoiceChoice[]
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
  return { choices }
}
