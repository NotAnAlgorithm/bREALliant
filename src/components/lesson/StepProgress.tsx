type StepProgressProps = {
  currentIndex: number
  total: number
  stepLabels: string[]
}

export function StepProgress({
  currentIndex,
  total,
  stepLabels,
}: StepProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span>
          Step {currentIndex + 1} of {total}
        </span>
        <span>{stepLabels[currentIndex]}</span>
      </div>
      <div className="flex gap-1.5" role="tablist" aria-label="Lesson progress">
        {stepLabels.map((label, index) => (
          <div
            key={index}
            role="tab"
            aria-selected={index === currentIndex}
            aria-label={`${label}${index === currentIndex ? ', current' : index < currentIndex ? ', completed' : ''}`}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index < currentIndex
                ? 'bg-brand'
                : index === currentIndex
                  ? 'bg-brand/70'
                  : 'bg-border'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
