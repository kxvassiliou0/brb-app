import type { ReactNode } from 'react'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  TABLE_ROW_HEIGHT,
  TableEmptyState,
  TableErrorState,
  TableLoadingState,
} from '@/components/ui/states'
import { TABLE_BREAKPOINT } from '@/lib/breakpoints'
import { useBreakpoint } from '@/lib/useMediaQuery'

export interface DataTableColumn<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  hideHeader?: boolean
  hideCardLabel?: boolean
  align?: 'left' | 'right'
}

interface DataTableProps<T> {
  caption: string
  columns: DataTableColumn<T>[]
  rows: T[] | null
  rowKey: (row: T) => string | number
  emptyMessage: string
  error?: unknown
  onRetry?: () => void
  emptyAction?: ReactNode
  loadingLabel?: string
  errorFallbackMessage?: string
  highlightRowKey?: string | number
}

export default function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  emptyMessage,
  error = null,
  onRetry,
  emptyAction,
  loadingLabel = 'Loading',
  errorFallbackMessage,
  highlightRowKey,
}: DataTableProps<T>) {
  const asTable = useBreakpoint(TABLE_BREAKPOINT)

  const isHighlighted = (row: T): boolean =>
    highlightRowKey !== undefined && rowKey(row) === highlightRowKey

  if (!asTable) {
    return (
      <section data-testid="data-cards" aria-label={caption}>
        {error ? (
          <ErrorState
            error={error}
            onRetry={onRetry}
            fallbackMessage={errorFallbackMessage}
          />
        ) : rows === null ? (
          <LoadingState label={loadingLabel} />
        ) : rows.length === 0 ? (
          <EmptyState message={emptyMessage} action={emptyAction} />
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li
                key={rowKey(row)}
                data-testid="data-card"
                data-highlighted={isHighlighted(row) ? 'true' : undefined}
                className={`rounded-xl border p-4 ${
                  isHighlighted(row)
                    ? 'border-sage-foreground bg-sage-background'
                    : 'border-border-primary bg-background-secondary'
                }`}
              >
                <dl className="flex flex-col gap-2">
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className={
                        column.hideCardLabel
                          ? 'pt-1'
                          : 'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'
                      }
                    >
                      <dt
                        className={
                          column.hideCardLabel
                            ? 'sr-only'
                            : 'text-sm text-text-secondary'
                        }
                      >
                        {column.header}
                      </dt>
                      <dd className="min-w-0 text-base text-text-primary">
                        {column.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  }

  return (
    <div className="w-full max-w-full overflow-x-auto">
      <table
        data-testid="data-table"
        className="w-full border-collapse text-left"
      >
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border-primary">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap text-text-secondary ${
                  column.align === 'right' ? 'text-right' : ''
                }`}
              >
                <span className={column.hideHeader ? 'sr-only' : undefined}>
                  {column.header}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        {error ? (
          <TableErrorState
            columns={columns.length}
            error={error}
            onRetry={onRetry}
            fallbackMessage={errorFallbackMessage}
          />
        ) : rows === null ? (
          <TableLoadingState columns={columns.length} label={loadingLabel} />
        ) : rows.length === 0 ? (
          <TableEmptyState
            columns={columns.length}
            message={emptyMessage}
            action={emptyAction}
          />
        ) : (
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                style={{ height: TABLE_ROW_HEIGHT }}
                data-highlighted={isHighlighted(row) ? 'true' : undefined}
                className={`border-b border-border-primary ${
                  isHighlighted(row) ? 'bg-sage-background' : ''
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-3 py-2 align-middle ${
                      column.align === 'right' ? 'text-right' : ''
                    }`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  )
}
