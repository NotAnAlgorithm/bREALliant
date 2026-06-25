import type { ReactNode } from 'react'

import { DefinitionTerm } from '../../components/blocks/DefinitionTerm'

/**
 * Parses a PLAIN-TEXT string (no LaTeX math) for a minimal subset of inline
 * markdown and returns an array of React nodes.
 *
 * Supported syntax (single level, no nesting):
 *  - `**bold**`   -> <strong>
 *  - `*italic*`   -> <em>
 *  - `` `code` `` -> <code>
 *
 * Unmatched delimiters are rendered literally and never throw.
 */
export function renderInlineMarkdown(
  text: string,
  keyPrefix = 'md',
): ReactNode[] {
  if (text.length === 0) {
    return []
  }

  const nodes: ReactNode[] = []
  let buffer = ''
  let keyIndex = 0

  const flushBuffer = () => {
    if (buffer.length > 0) {
      nodes.push(buffer)
      buffer = ''
    }
  }

  const pushElement = (element: (key: string) => ReactNode) => {
    nodes.push(element(`${keyPrefix}-${keyIndex}`))
    keyIndex += 1
  }

  let i = 0
  while (i < text.length) {
    const char = text[i]

    // Bold: **...** (checked before single * so it isn't seen as empty italic)
    if (char === '*' && text[i + 1] === '*') {
      const close = text.indexOf('**', i + 2)
      if (close !== -1) {
        const inner = text.slice(i + 2, close)
        flushBuffer()
        pushElement((key) => <strong key={key}>{inner}</strong>)
        i = close + 2
        continue
      }
    }

    // Italic: *...*
    if (char === '*') {
      const close = text.indexOf('*', i + 1)
      if (close !== -1 && close > i + 1) {
        const inner = text.slice(i + 1, close)
        flushBuffer()
        pushElement((key) => <em key={key}>{inner}</em>)
        i = close + 1
        continue
      }
    }

    // Definition term: [[key]] or [[display|key]]
    if (char === '[' && text[i + 1] === '[') {
      const close = text.indexOf(']]', i + 2)
      if (close !== -1) {
        const inner = text.slice(i + 2, close)
        const pipe = inner.indexOf('|')
        let display: string
        let key: string
        if (pipe !== -1) {
          display = inner.slice(0, pipe).trim()
          key = inner.slice(pipe + 1).trim()
        } else {
          display = inner.trim()
          key = display
        }
        flushBuffer()
        pushElement((elementKey) => (
          <DefinitionTerm key={elementKey} termKey={key} label={display} />
        ))
        i = close + 2
        continue
      }
    }

    // Inline code: `...`
    if (char === '`') {
      const close = text.indexOf('`', i + 1)
      if (close !== -1) {
        const inner = text.slice(i + 1, close)
        flushBuffer()
        pushElement((key) => (
          <code
            key={key}
            className="rounded bg-surface px-1 py-0.5 font-mono text-[0.9em]"
          >
            {inner}
          </code>
        ))
        i = close + 1
        continue
      }
    }

    // Default: literal character (covers unmatched delimiters too).
    buffer += char
    i += 1
  }

  flushBuffer()

  return nodes
}
