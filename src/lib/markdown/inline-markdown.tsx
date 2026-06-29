import type { ReactNode } from 'react'

import { DefinitionTerm } from '../../components/blocks/DefinitionTerm'
import { renderMath } from '../latex/render-math'
import { parseRichText, type RichNode } from './parse-rich-text'

/**
 * Parses a string for inline math, a minimal subset of inline markdown and
 * definition terms, returning an array of React nodes.
 *
 * Supported syntax:
 *  - `$...$` / `$$...$$` -> KaTeX (opaque: never markdown-parsed inside)
 *  - `` `code` ``         -> <code> (opaque: literal contents)
 *  - `[[key]]` / `[[display|key]]` -> <DefinitionTerm>
 *  - `**bold**`           -> <strong> (may span math/code/text)
 *  - `*italic*`           -> <em>     (may span math/code/text)
 *
 * Emphasis wrappers can span across math/code atoms, but never split one.
 * Unmatched delimiters are rendered literally and never throw.
 */
export function renderInlineMarkdown(
  text: string,
  keyPrefix = 'md',
): ReactNode[] {
  if (text.length === 0) {
    return []
  }

  return renderNodes(parseRichText(text), keyPrefix)
}

function renderNodes(nodes: RichNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => renderNode(node, `${keyPrefix}-${index}`))
}

function renderNode(node: RichNode, key: string): ReactNode {
  switch (node.type) {
    case 'text':
      return (
        <span key={key} className="whitespace-pre-wrap">
          {node.value}
        </span>
      )

    case 'math': {
      const html = renderMath(node.value, { displayMode: node.display })
      return (
        <span
          key={key}
          className={
            node.display
              ? 'math-block my-2 block overflow-x-auto'
              : 'math-inline mx-0.5 inline-block align-baseline'
          }
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )
    }

    case 'code':
      return (
        <code
          key={key}
          className="rounded bg-surface px-1 py-0.5 font-mono text-[0.9em]"
        >
          {node.value}
        </code>
      )

    case 'defterm':
      return <DefinitionTerm key={key} termKey={node.key} label={node.label} />

    case 'strong':
      return <strong key={key}>{renderNodes(node.children, key)}</strong>

    case 'em':
      return <em key={key}>{renderNodes(node.children, key)}</em>
  }
}
