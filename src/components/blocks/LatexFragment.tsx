import { renderMath } from '../../lib/latex/render-math'

type LatexFragmentProps = {
  latex: string
  display?: boolean
  className?: string
}

/** Renders a LaTeX string without requiring $ delimiters (for widgets, templates). */
export function LatexFragment({
  latex,
  display = false,
  className = '',
}: LatexFragmentProps) {
  if (!latex.trim()) return null

  const html = renderMath(latex, { displayMode: display })

  return (
    <span
      className={`${display ? 'math-block block overflow-x-auto' : 'math-inline inline-block align-baseline'} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
