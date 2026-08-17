import { useMemo, type ReactNode } from 'react'
import Button from '@/components/Button'
import DataTable, { type DataTableColumn } from '@/components/DataTable'
import LinkButton from '@/components/LinkButton'
import StatusPill from '@/components/StatusPill'
import { formatDate, formatDateRange } from '@/lib/dates'
import type { RequestRow } from '@/lib/requestFilters'
import { REQUESTS_PATH } from '@/lib/routeAccess'
import { REVIEW_LABEL, type ReviewAction } from '@/lib/reviewRequest'

interface RequestsTableProps {
  rows: RequestRow[] | null
  error: unknown
  onRetry: () => void
  showEmployee: boolean
  onDecide?: (action: ReviewAction, requestId: number) => void
  decidingId?: number | null
  highlightRequestId?: number
  emptyMessage: string
  emptyAction?: ReactNode
}

export default function RequestsTable({
  rows,
  error,
  onRetry,
  showEmployee,
  onDecide,
  decidingId = null,
  highlightRequestId,
  emptyMessage,
  emptyAction,
}: RequestsTableProps) {
  const columns = useMemo<DataTableColumn<RequestRow>[]>(() => {
    const base: DataTableColumn<RequestRow>[] = [
      { key: 'type', header: 'Type', cell: (r) => r.leave_type },
      {
        key: 'dates',
        header: 'Dates',
        cell: (r) => formatDateRange(r.start_date, r.end_date),
      },
      { key: 'days', header: 'Days', cell: (r) => r.days_requested },
      {
        key: 'requested',
        header: 'Date requested',
        cell: (r) => (
          <span className="text-text-secondary">
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
        cell: (r) => r.employee_name ?? `#${r.employee_id}`,
      })
      base.push({
        key: 'actions',
        header: 'Actions',
        hideHeader: true,
        hideCardLabel: true,
        cell: (r) => (
          <div className="flex flex-wrap items-center gap-2">
            {onDecide && r.status === 'Pending' && (
              <>
                <Button
                  variant="secondary"
                  disabled={decidingId === r.id}
                  onClick={() => onDecide('reject', r.id)}
                >
                  {REVIEW_LABEL.reject}
                </Button>
                <Button
                  disabled={decidingId === r.id}
                  onClick={() => onDecide('approve', r.id)}
                >
                  {REVIEW_LABEL.approve}
                </Button>
              </>
            )}
            <LinkButton
              to={`${REQUESTS_PATH}/${r.id}`}
              state={{ request: r }}
              variant="secondary"
            >
              Details
            </LinkButton>
          </div>
        ),
      })
    }

    return base
  }, [showEmployee, onDecide, decidingId])

  return (
    <DataTable
      caption={showEmployee ? 'Team time-off requests' : 'My time-off requests'}
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      highlightRowKey={highlightRequestId}
      error={error}
      onRetry={onRetry}
      loadingLabel="Loading requests"
      errorFallbackMessage="Failed to load requests"
      emptyMessage={emptyMessage}
      emptyAction={emptyAction}
    />
  )
}
