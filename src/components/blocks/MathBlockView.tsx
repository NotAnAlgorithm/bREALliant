import type { MathBlock } from '@content/schemas/blocks'

import { renderMath } from '../../lib/latex/render-math'

type MathBlockViewProps = {
  block: MathBlock
}

export function MathBlockView({ block }: MathBlockViewProps) {
  const html = renderMath(block.latex, { displayMode: true })

  return (
    <div
      className="math-block overflow-x-auto rounded-lg bg-surface px-4 py-3"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
