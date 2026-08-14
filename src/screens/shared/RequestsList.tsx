import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { apiFetch } from '../../lib/api'
import type { ApiSuccess, LeaveRequest } from '@/types/api'
import PageHeader from '../../components/PageHeader'
import {
  TABLE_ROW_HEIGHT,
  TableEmptyState,
  TableErrorState,
  TableLoadingState,
} from '@/components/states'

const COLUMN_COUNT = 5

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
    apiFetch<ApiSuccess<LeaveRequest[]>>('/api/leave-requests')
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

  return (
    <div data-testid="screen-requests">
      <PageHeader
        title="Requests"
        description="Time-off requests awaiting review."
      />
      <Link to={`${basePath}/requests/new`}>New request</Link>
      <table>
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Type</th>
            <th>Dates</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        {error ? (
          <TableErrorState
            columns={COLUMN_COUNT}
            error={error}
            onRetry={retry}
            fallbackMessage="Failed to load requests"
          />
        ) : requests === null ? (
          <TableLoadingState columns={COLUMN_COUNT} label="Loading requests" />
        ) : requests.length === 0 ? (
          <TableEmptyState
            columns={COLUMN_COUNT}
            message="No requests to review yet."
            action={<Link to={`${basePath}/requests/new`}>New request</Link>}
          />
        ) : (
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} style={{ height: TABLE_ROW_HEIGHT }}>
                <td>{r.employee_id}</td>
                <td>{r.leave_type}</td>
                <td>
                  {r.start_date} – {r.end_date}
                </td>
                <td>{r.status}</td>
                <td>
                  <Link
                    to={`${basePath}/requests/${r.id}`}
                    state={{ request: r }}
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  )
}
