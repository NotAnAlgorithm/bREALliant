import {
  hasLatexDelimiters,
  parseLatexSegments,
  renderMath,
} from '../../lib/latex/render-math'
import { renderInlineMarkdown } from '../../lib/markdown/inline-markdown'

type RichTextProps = {
  content: string
  className?: string
}

export function RichText({ content, className = '' }: RichTextProps) {
  if (!hasLatexDelimiters(content)) {
    return (
      <p className={`whitespace-pre-wrap leading-relaxed ${className}`}>
        {renderInlineMarkdown(content)}
      </p>
    )
  }

  const segments = parseLatexSegments(content)

  return (
    <p className={`leading-relaxed ${className}`}>
      {segments.map((segment, index) => {
        if (segment.kind === 'text') {
          return (
            <span key={index} className="whitespace-pre-wrap">
              {renderInlineMarkdown(segment.value, `md-${index}`)}
            </span>
          )
        }

        const html = renderMath(segment.value, {
          displayMode: segment.display,
        })

        if (segment.display) {
          return (
            <span
              key={index}
              className="math-block my-2 block overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        }

        return (
          <span
            key={index}
            className="math-inline mx-0.5 inline-block align-middle"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      })}
    </p>
  )
}
