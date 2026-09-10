import type { ReactNode } from 'react'
import EmptyState from './EmptyState'
import ErrorState from './ErrorState'
import LoadingState from './LoadingState'
import TableEmptyState from './TableEmptyState'
import TableErrorState from './TableErrorState'
import TableLoadingState from './TableLoadingState'

interface ResourceStateOptions<T> {
  data: T | null
  error?: unknown
  onRetry?: () => void
  label?: string
  fallbackMessage?: string
  emptyMessage?: string
  emptyAction?: ReactNode
  variant?: 'block' | 'table'
  columns?: number
}

export type ResourceState<T> =
  { ready: true; data: T } | { ready: false; fallback: ReactNode }

export function useResourceState<T>({
  data,
  error = null,
  onRetry,
  label,
  fallbackMessage,
  emptyMessage,
  emptyAction,
  variant = 'block',
  columns = 1,
}: ResourceStateOptions<T>): ResourceState<T> {
  const table = variant === 'table'

  if (error) {
    return {
      ready: false,
      fallback: table ? (
        <TableErrorState
          columns={columns}
          error={error}
          onRetry={onRetry}
          fallbackMessage={fallbackMessage}
        />
      ) : (
        <ErrorState
          error={error}
          onRetry={onRetry}
          fallbackMessage={fallbackMessage}
        />
      ),
    }
  }

  if (data === null) {
    return {
      ready: false,
      fallback: table ? (
        <TableLoadingState columns={columns} label={label} />
      ) : (
        <LoadingState label={label} />
      ),
    }
  }

  if (emptyMessage !== undefined && Array.isArray(data) && data.length === 0) {
    return {
      ready: false,
      fallback: table ? (
        <TableEmptyState
          columns={columns}
          message={emptyMessage}
          action={emptyAction}
        />
      ) : (
        <EmptyState message={emptyMessage} action={emptyAction} />
      ),
    }
  }

  return { ready: true, data }
}
