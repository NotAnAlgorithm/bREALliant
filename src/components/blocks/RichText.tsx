import { renderInlineMarkdown } from '../../lib/markdown/inline-markdown'

type RichTextProps = {
  content: string
  className?: string
}

export function RichText({ content, className = '' }: RichTextProps) {
  return (
    <p className={`leading-relaxed ${className}`}>
      {renderInlineMarkdown(content)}
    </p>
  )
}
