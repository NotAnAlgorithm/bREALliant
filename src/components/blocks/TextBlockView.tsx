import type { TextBlock } from '@content/schemas/blocks'

import { RichText } from './RichText'

type TextBlockViewProps = {
  block: TextBlock
}

export function TextBlockView({ block }: TextBlockViewProps) {
  return (
    <RichText
      content={block.content}
      className="text-base text-ink"
    />
  )
}
