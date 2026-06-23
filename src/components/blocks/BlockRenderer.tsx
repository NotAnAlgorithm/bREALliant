import type { Block } from '@content/schemas/blocks'

import { MathBlockView } from './MathBlockView'
import { TextBlockView } from './TextBlockView'

type BlockRendererProps = {
  blocks: Block[]
}

export function BlockRenderer({ blocks }: BlockRendererProps) {
  if (blocks.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'text':
            return <TextBlockView key={index} block={block} />
          case 'math':
            return <MathBlockView key={index} block={block} />
          default: {
            const _exhaustive: never = block
            return _exhaustive
          }
        }
      })}
    </div>
  )
}
