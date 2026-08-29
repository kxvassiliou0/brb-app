import { useMemo, type ReactNode } from 'react'
import Button from '@/components/ui/Button'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import Icon from '@/components/ui/Icon'
import StatusPill from '@/components/ui/StatusPill'
import { CANCEL_LABEL, isCancellable } from '@/lib/cancelRequest'
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
  showReviewer: boolean
  onDecide: ((action: ReviewAction, requestId: number) => void) | null
  onCancel: ((requestId: number) => void) | null
  onOpen: (requestId: number) => void
  decidingId: number | null
  cancellingId: number | null
  highlightRequestId: number | null
  emptyMessage: string
  emptyAction: ReactNode
}

export default function RequestsTable({
  rows,
  error,
  onRetry,
  showEmployee,
  showReviewer,
  onDecide,
  onCancel,
  onOpen,
  decidingId,
  cancellingId,
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

    if (showReviewer) {
      base.push({
        key: 'reviewer',
        header: 'Reviewed by',
        cell: (r) => (
          <span className="whitespace-nowrap text-text-secondary">
            {r.reviewed_by_name?.trim() ? r.reviewed_by_name : '—'}
          </span>
        ),
      })
    }

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
            <div className="flex items-center justify-end">
              <Button
                variant="ghostDanger"
                disabled={decidingId === r.id}
                onClick={() => onDecide('reject', r.id)}
              >
                <Icon name="cross" />
                <span className="sr-only">{REVIEW_LABEL.reject}</span>
              </Button>
              <Button
                variant="ghost"
                disabled={decidingId === r.id}
                onClick={() => onDecide('approve', r.id)}
              >
                <Icon name="check" />
                <span className="sr-only">{REVIEW_LABEL.approve}</span>
              </Button>
            </div>
          ) : null,
      })
    } else if (onCancel) {
      base.push({
        key: 'actions',
        header: 'Actions',
        hideHeader: true,
        hideCardLabel: true,
        align: 'right',
        cell: (r) =>
          isCancellable(r.status) ? (
            <div className="flex items-center justify-end">
              <button
                type="button"
                title={CANCEL_LABEL}
                disabled={cancellingId === r.id}
                onClick={() => onCancel(r.id)}
                className="touch-target inline-flex shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-error-background hover:text-error-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="trash" />
                <span className="sr-only">{CANCEL_LABEL}</span>
              </button>
            </div>
          ) : null,
      })
    }

    return base
  }, [
    showEmployee,
    showReviewer,
    onDecide,
    onCancel,
    onOpen,
    decidingId,
    cancellingId,
  ])

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
