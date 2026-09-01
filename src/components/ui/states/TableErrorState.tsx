import { getApiErrorMessage } from '@/api/client'
import { TABLE_ROW_HEIGHT } from './metrics'

interface TableErrorStateProps {
  columns: number
  error: unknown
  onRetry?: () => void
  fallbackMessage?: string
}

export default function TableErrorState({
  columns,
  error,
  onRetry,
  fallbackMessage,
}: TableErrorStateProps) {
  return (
    <tbody data-testid="table-error-state">
      <tr style={{ height: TABLE_ROW_HEIGHT }}>
        <td colSpan={columns}>
          <div
            role="alert"
            className="flex flex-col items-center justify-center gap-3 rounded-sm bg-error-background p-4 text-center text-error-foreground"
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
        </td>
      </tr>
    </tbody>
  )
}
