import { useCallback, useEffect, useMemo, useState } from 'react'
import { cachedGet } from '@/lib/apiCache'
import type { ApiSuccess, OwnLeaveRequest } from '@/types/api'
import { useAuth } from '../../lib/auth'
import BookTimeOffButton from '@/components/BookTimeOffButton'
import DataTable, { type DataTableColumn } from '@/components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatusPill from '@/components/StatusPill'
import { countDays, formatDateRange } from '@/lib/dates'

export default function MyRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<OwnLeaveRequest[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setRequests(null)
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    cachedGet<ApiSuccess<OwnLeaveRequest[]>>(
      `/api/leave-requests/status/${user.id}`,
      attempt > 0
    )
      .then((res) => {
        if (!cancelled) setRequests(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
    return () => {
      cancelled = true
    }
  }, [user, attempt])

  const columns = useMemo<DataTableColumn<OwnLeaveRequest>[]>(
    () => [
      { key: 'type', header: 'Type', cell: (r) => r.leave_type },
      {
        key: 'dates',
        header: 'Dates',
        cell: (r) => formatDateRange(r.start_date, r.end_date),
      },
      {
        key: 'days',
        header: 'Days',
        cell: (r) => countDays(r.start_date, r.end_date),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (r) => <StatusPill status={r.status} />,
      },
    ],
    []
  )

  return (
    <div data-testid="screen-my-requests">
      <PageHeader
        title="My requests"
        description="Your time-off request history."
        action={<BookTimeOffButton onBooked={retry} />}
      />
      <DataTable
        caption="My time-off requests"
        columns={columns}
        rows={requests}
        rowKey={(r) => r.id}
        error={error}
        onRetry={retry}
        loadingLabel="Loading your requests"
        errorFallbackMessage="Failed to load your requests"
        emptyMessage="You have not requested any time off yet."
        emptyAction={<BookTimeOffButton onBooked={retry} />}
      />
    </div>
  )
}
