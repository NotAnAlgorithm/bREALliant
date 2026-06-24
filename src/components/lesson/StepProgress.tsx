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
            className={`h-1.5 flex-1 origin-left rounded-full transition-all duration-300 ease-out motion-reduce:transition-colors ${
              index < currentIndex
                ? 'bg-brand opacity-100'
                : index === currentIndex
                  ? 'bg-brand/70 opacity-100 motion-safe:animate-pulse'
                  : 'bg-border opacity-70'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
