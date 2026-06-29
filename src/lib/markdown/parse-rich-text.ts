/**
 * Unified inline parser for rich text combining LaTeX math, inline markdown
 * (bold/italic/code) and definition terms into a single node tree.
 *
 * The key property over the old two-phase approach (split on math, then run
 * markdown per text segment) is that emphasis wrappers may SPAN across math and
 * other atoms, while markdown characters living INSIDE an opaque atom (math or
 * code) are never interpreted.
 *
 * Precedence while scanning left-to-right:
 *  1. Opaque atoms (nothing inside is parsed further):
 *       - `$$...$$` block math, `$...$` inline math  -> handed raw to KaTeX
 *       - `` `...` `` inline code (literal contents)
 *       - `[[key]]` / `[[display|key]]` definition terms
 *  2. Wrappers whose body is itself a sequence of atoms + text:
 *       - `**...**` strong, `*...*` em
 *
 * Unmatched delimiters (lone `*`, `` ` ``, `$`, `[[`) are emitted as literal
 * text. A `\$` is treated as a literal dollar sign in text (never inside math).
 */

export type RichNode =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string; display: boolean }
  | { type: 'code'; value: string }
  | { type: 'defterm'; label: string; key: string }
  | { type: 'strong'; children: RichNode[] }
  | { type: 'em'; children: RichNode[] }

type Atom = { node: RichNode; next: number }

/**
 * Attempt to read an opaque atom (math / code / definition term) starting at
 * `i`, bounded by `end`. Returns the parsed node and the index just past it, or
 * `null` if no complete atom starts here (in which case the char is literal).
 */
function tryAtom(text: string, i: number, end: number): Atom | null {
  const char = text[i]

  // Block math: $$...$$ (checked before inline so a leading $$ wins).
  if (char === '$' && text[i + 1] === '$') {
    const close = text.indexOf('$$', i + 2)
    if (close !== -1 && close + 2 <= end) {
      return {
        node: { type: 'math', value: text.slice(i + 2, close), display: true },
        next: close + 2,
      }
    }
    return null
  }

  // Inline math: $...$
  if (char === '$') {
    const close = text.indexOf('$', i + 1)
    if (close !== -1 && close < end) {
      return {
        node: { type: 'math', value: text.slice(i + 1, close), display: false },
        next: close + 1,
      }
    }
    return null
  }

  // Inline code: `...` (opaque: contents are literal, never math/markdown).
  if (char === '`') {
    const close = text.indexOf('`', i + 1)
    if (close !== -1 && close < end) {
      return {
        node: { type: 'code', value: text.slice(i + 1, close) },
        next: close + 1,
      }
    }
    return null
  }

  // Definition term: [[key]] or [[display|key]]
  if (char === '[' && text[i + 1] === '[') {
    const close = text.indexOf(']]', i + 2)
    if (close !== -1 && close + 2 <= end) {
      const inner = text.slice(i + 2, close)
      const pipe = inner.indexOf('|')
      const label = (pipe !== -1 ? inner.slice(0, pipe) : inner).trim()
      const key = (pipe !== -1 ? inner.slice(pipe + 1) : inner).trim()
      return { node: { type: 'defterm', label, key }, next: close + 2 }
    }
    return null
  }

  return null
}

/**
 * Find the index of the next `delim` occurrence within `[from, end)` that lives
 * at the TEXT level — i.e. skipping over any opaque atoms so a delimiter inside
 * math or code is never matched as a wrapper boundary.
 */
function findCloseDelim(
  text: string,
  from: number,
  end: number,
  delim: string,
): number {
  let i = from
  while (i < end) {
    if (text[i] === '\\' && text[i + 1] === '$') {
      i += 2
      continue
    }
    const atom = tryAtom(text, i, end)
    if (atom) {
      i = atom.next
      continue
    }
    if (i + delim.length <= end && text.startsWith(delim, i)) {
      return i
    }
    i += 1
  }
  return -1
}

function parseSequence(text: string, start: number, end: number): RichNode[] {
  const nodes: RichNode[] = []
  let buffer = ''

  const flush = () => {
    if (buffer.length > 0) {
      nodes.push({ type: 'text', value: buffer })
      buffer = ''
    }
  }

  let i = start
  while (i < end) {
    // Escaped dollar -> literal `$` (so it can't open a math span).
    if (text[i] === '\\' && text[i + 1] === '$') {
      buffer += '$'
      i += 2
      continue
    }

    // Opaque atoms take priority over wrappers.
    const atom = tryAtom(text, i, end)
    if (atom) {
      flush()
      nodes.push(atom.node)
      i = atom.next
      continue
    }

    // Strong wrapper: **...** (checked before * so it isn't seen as empty em).
    if (text[i] === '*' && text[i + 1] === '*') {
      const close = findCloseDelim(text, i + 2, end, '**')
      if (close !== -1) {
        flush()
        nodes.push({
          type: 'strong',
          children: parseSequence(text, i + 2, close),
        })
        i = close + 2
        continue
      }
    }

    // Em wrapper: *...*
    if (text[i] === '*') {
      const close = findCloseDelim(text, i + 1, end, '*')
      if (close !== -1 && close > i + 1) {
        flush()
        nodes.push({
          type: 'em',
          children: parseSequence(text, i + 1, close),
        })
        i = close + 1
        continue
      }
    }

    // Default: literal character (covers all unmatched delimiters).
    buffer += text[i]
    i += 1
  }

  flush()
  return nodes
}

export function parseRichText(text: string): RichNode[] {
  return parseSequence(text, 0, text.length)
}
