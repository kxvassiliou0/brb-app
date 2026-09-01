import type { ReactNode } from 'react'
import { STATE_MIN_HEIGHT } from './metrics'

interface EmptyStateProps {
  message: string
  action?: ReactNode
}

export default function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      role="status"
      className="flex flex-col items-center justify-center gap-4 text-center text-text-secondary"
      style={{ minHeight: STATE_MIN_HEIGHT }}
    >
      <p>{message}</p>
      {action}
    </div>
  )
}
