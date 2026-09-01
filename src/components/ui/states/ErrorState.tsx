import { getApiErrorMessage } from '@/api/client'
import { STATE_MIN_HEIGHT } from './metrics'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  fallbackMessage?: string
}

export default function ErrorState({
  error,
  onRetry,
  fallbackMessage,
}: ErrorStateProps) {
  return (
    <div
      data-testid="error-state"
      role="alert"
      className="flex flex-col items-center justify-center gap-4 rounded-sm bg-error-background p-4 text-center text-error-foreground"
      style={{ minHeight: STATE_MIN_HEIGHT }}
    >
      <p>{getApiErrorMessage(error, fallbackMessage)}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="touch-target inline-flex items-center justify-center rounded-full bg-interactive-primary px-4 text-interactive-text hover:bg-interactive-hover"
        >
          Try again
        </button>
      )}
    </div>
  )
}
