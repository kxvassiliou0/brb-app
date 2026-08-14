import type { ReactNode } from 'react'
import { STATE_MIN_HEIGHT } from './metrics'

interface EmptyStateProps {
  message: string
  action?: ReactNode
  minHeight?: string
}

export default function EmptyState({
  message,
  action,
  minHeight = STATE_MIN_HEIGHT,
}: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      role="status"
      className="flex flex-col items-center justify-center gap-4 text-center text-text-secondary"
      style={{ minHeight }}
    >
      <p>{message}</p>
      {action}
    </div>
  )
}
