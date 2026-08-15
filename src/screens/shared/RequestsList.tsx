import { useCallback, useEffect, useMemo, useState } from 'react'
import { cachedGet } from '@/lib/apiCache'
import type { ApiSuccess, LeaveRequest } from '@/types/api'
import BookTimeOffButton from '@/components/BookTimeOffButton'
import DataTable, { type DataTableColumn } from '@/components/DataTable'
import LinkButton from '@/components/LinkButton'
import PageHeader from '../../components/PageHeader'
import StatusPill from '@/components/StatusPill'

export default function RequestsList({ basePath }: { basePath: string }) {
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setRequests(null)
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    cachedGet<ApiSuccess<LeaveRequest[]>>('/api/leave-requests', attempt > 0)
      .then((res) => {
        if (!cancelled) setRequests(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const columns = useMemo<DataTableColumn<LeaveRequest>[]>(
    () => [
      { key: 'employee', header: 'Employee ID', cell: (r) => r.employee_id },
      { key: 'type', header: 'Type', cell: (r) => r.leave_type },
      {
        key: 'dates',
        header: 'Dates',
        cell: (r) => `${r.start_date} – ${r.end_date}`,
      },
      {
        key: 'status',
        header: 'Status',
        cell: (r) => <StatusPill status={r.status} />,
      },
      {
        key: 'review',
        header: 'Review',
        hideHeader: true,
        hideCardLabel: true,
        cell: (r) => (
          <LinkButton
            to={`${basePath}/requests/${r.id}`}
            state={{ request: r }}
            variant="secondary"
          >
            Review
          </LinkButton>
        ),
      },
    ],
    [basePath]
  )

  return (
    <div data-testid="screen-requests">
      <PageHeader
        title="Requests"
        description="Time-off requests awaiting review."
        action={<BookTimeOffButton onBooked={retry} />}
      />
      <DataTable
        caption="Time-off requests"
        columns={columns}
        rows={requests}
        rowKey={(r) => r.id}
        error={error}
        onRetry={retry}
        loadingLabel="Loading requests"
        errorFallbackMessage="Failed to load requests"
        emptyMessage="No requests to review yet."
        emptyAction={<BookTimeOffButton onBooked={retry} />}
      />
    </div>
  )
}
