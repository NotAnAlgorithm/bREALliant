import { type CourseView } from '../../contexts/course-view-context'
import { useCourseView } from '../../hooks/useCourseView'

type Option = {
  value: CourseView
  label: string
  icon: React.ReactNode
}

const MapIcon = (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M6 4a2 2 0 1 0-1 3.732V8a2 2 0 0 0 2 2h1a1 1 0 0 1 1 1v1.268a2 2 0 1 0 2 0V12a1 1 0 0 1 1-1h1a2 2 0 0 0 2-2v-.268A2 2 0 1 0 14 4a2 2 0 0 0-1 3.732V8a.5.5 0 0 1-.5.5h-1a2 2 0 0 0-1.5.68A2 2 0 0 0 8.5 8.5h-1A.5.5 0 0 1 7 8v-.268A2 2 0 0 0 6 4Z" />
  </svg>
)

const ListIcon = (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      d="M4 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3.5 0a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2h-8ZM4 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3.5 0a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2h-8ZM4 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3.5 0a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-8Z"
      clipRule="evenodd"
    />
  </svg>
)

const OPTIONS: Option[] = [
  { value: 'map', label: 'Map', icon: MapIcon },
  { value: 'list', label: 'List', icon: ListIcon },
]

export function CourseViewToggle() {
  const { view, setView } = useCourseView()

  return (
    <div
      role="group"
      aria-label="Course view"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-elevated p-1"
    >
      {OPTIONS.map((option) => {
        const isActive = view === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setView(option.value)}
            aria-pressed={isActive}
            aria-label={`${option.label} view`}
            className={[
              'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand text-white'
                : 'text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
