import { useMemo, type ReactNode } from 'react'
import Button from '@/components/Button'
import DataTable, { type DataTableColumn } from '@/components/DataTable'
import StatusPill from '@/components/StatusPill'
import { formatDate, formatDateRange } from '@/lib/dates'
import type { RequestRow } from '@/lib/requestFilters'
import { REVIEW_LABEL, type ReviewAction } from '@/lib/reviewRequest'

const OPENS =
  'touch-target text-left font-medium whitespace-nowrap text-text-primary underline decoration-1 underline-offset-4 hover:text-sage-foreground'

interface RequestsTableProps {
  rows: RequestRow[] | null
  error: unknown
  onRetry: () => void
  showEmployee: boolean
  onDecide: ((action: ReviewAction, requestId: number) => void) | null
  onOpen: (requestId: number) => void
  decidingId: number | null
  highlightRequestId: number | null
  emptyMessage: string
  emptyAction: ReactNode
}

export default function RequestsTable({
  rows,
  error,
  onRetry,
  showEmployee,
  onDecide,
  onOpen,
  decidingId,
  highlightRequestId,
  emptyMessage,
  emptyAction,
}: RequestsTableProps) {
  const columns = useMemo<DataTableColumn<RequestRow>[]>(() => {
    const base: DataTableColumn<RequestRow>[] = [
      {
        key: 'type',
        header: 'Type',
        cell: (r) =>
          showEmployee ? (
            r.leave_type
          ) : (
            <button
              type="button"
              onClick={() => onOpen(r.id)}
              className={OPENS}
            >
              {r.leave_type}
            </button>
          ),
      },
      {
        key: 'dates',
        header: 'Dates',
        cell: (r) => (
          <span className="whitespace-nowrap">
            {formatDateRange(r.start_date, r.end_date)}
          </span>
        ),
      },
      { key: 'days', header: 'Days', cell: (r) => r.days_requested },
      {
        key: 'requested',
        header: 'Date requested',
        cell: (r) => (
          <span className="whitespace-nowrap text-text-secondary">
            {r.date_requested ? formatDate(r.date_requested) : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        align: 'right',
        cell: (r) => <StatusPill status={r.status} />,
      },
    ]

    if (showEmployee) {
      base.unshift({
        key: 'employee',
        header: 'Employee',
        cell: (r) => (
          <button type="button" onClick={() => onOpen(r.id)} className={OPENS}>
            {r.employee_name ?? `#${r.employee_id}`}
          </button>
        ),
      })
      base.push({
        key: 'actions',
        header: 'Actions',
        hideHeader: true,
        hideCardLabel: true,
        align: 'right',
        cell: (r) =>
          onDecide && r.status === 'Pending' ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                disabled={decidingId === r.id}
                onClick={() => onDecide('reject', r.id)}
              >
                {REVIEW_LABEL.reject}
              </Button>
              <Button
                variant="primary"
                disabled={decidingId === r.id}
                onClick={() => onDecide('approve', r.id)}
              >
                {REVIEW_LABEL.approve}
              </Button>
            </div>
          ) : null,
      })
    }

    return base
  }, [showEmployee, onDecide, onOpen, decidingId])

  return (
    <DataTable
      caption={showEmployee ? 'Team time-off requests' : 'My time-off requests'}
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      highlightRowKey={highlightRequestId ?? undefined}
      error={error}
      onRetry={onRetry}
      loadingLabel="Loading requests"
      errorFallbackMessage="Failed to load requests"
      emptyMessage={emptyMessage}
      emptyAction={emptyAction}
    />
  )
}
