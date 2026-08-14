import { getApiErrorMessage } from '@/lib/api'
import { STATE_MIN_HEIGHT } from './metrics'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  fallbackMessage?: string
  retryLabel?: string
  minHeight?: string
}

export default function ErrorState({
  error,
  onRetry,
  fallbackMessage,
  retryLabel = 'Try again',
  minHeight = STATE_MIN_HEIGHT,
}: ErrorStateProps) {
  return (
    <div
      data-testid="error-state"
      role="alert"
      className="flex flex-col items-center justify-center gap-4 rounded-sm bg-error-background p-4 text-center text-error-foreground"
      style={{ minHeight }}
    >
      <p>{getApiErrorMessage(error, fallbackMessage)}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="touch-target inline-flex items-center justify-center rounded-full bg-interactive-primary px-4 text-interactive-text hover:bg-interactive-hover"
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
