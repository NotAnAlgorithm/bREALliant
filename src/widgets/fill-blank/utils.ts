export type FillBlankProps = {
  template?: string
  placeholder?: string
}

export type FillBlankState = {
  answer: string
}

export function parseFillBlankProps(props: Record<string, unknown>): FillBlankProps {
  return {
    template:
      typeof props.template === 'string' ? props.template : '{{answer}}',
    placeholder:
      typeof props.placeholder === 'string' ? props.placeholder : '…',
  }
}

export function splitTemplate(template: string): [string, string] {
  const token = '{{answer}}'
  const index = template.indexOf(token)
  if (index === -1) {
    return [template, '']
  }
  return [template.slice(0, index), template.slice(index + token.length)]
}
