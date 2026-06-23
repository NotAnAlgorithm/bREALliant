import katex from 'katex'

export type RenderMathOptions = {
  displayMode?: boolean
}

export function renderMath(latex: string, options: RenderMathOptions = {}): string {
  return katex.renderToString(latex, {
    displayMode: options.displayMode ?? false,
    throwOnError: false,
    strict: 'ignore',
    trust: false,
    output: 'htmlAndMathml',
  })
}

/** Split text on $...$ (inline) and $$...$$ (display) delimiters. */
export function parseLatexSegments(text: string): Array<
  | { kind: 'text'; value: string }
  | { kind: 'math'; value: string; display: boolean }
> {
  const segments: Array<
    | { kind: 'text'; value: string }
    | { kind: 'math'; value: string; display: boolean }
  > = []
  let i = 0

  while (i < text.length) {
    const displayStart = text.indexOf('$$', i)
    const inlineStart = text.indexOf('$', i)

    const next =
      displayStart !== -1 &&
      (inlineStart === -1 || displayStart <= inlineStart)
        ? { index: displayStart, display: true, delimLen: 2 }
        : inlineStart !== -1
          ? { index: inlineStart, display: false, delimLen: 1 }
          : null

    if (!next) {
      segments.push({ kind: 'text', value: text.slice(i) })
      break
    }

    if (next.index > i) {
      segments.push({ kind: 'text', value: text.slice(i, next.index) })
    }

    const close = text.indexOf(
      next.display ? '$$' : '$',
      next.index + next.delimLen,
    )
    if (close === -1) {
      segments.push({ kind: 'text', value: text.slice(next.index) })
      break
    }

    segments.push({
      kind: 'math',
      value: text.slice(next.index + next.delimLen, close),
      display: next.display,
    })
    i = close + next.delimLen
  }

  return segments
}

export function hasLatexDelimiters(text: string): boolean {
  return text.includes('$')
}
