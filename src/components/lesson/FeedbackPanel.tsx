type FeedbackPanelProps = {
  correct: boolean
  message: string
}

export function FeedbackPanel({ correct, message }: FeedbackPanelProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${
        correct
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-error/30 bg-error/10 text-error'
      }`}
    >
      {message}
    </div>
  )
}
