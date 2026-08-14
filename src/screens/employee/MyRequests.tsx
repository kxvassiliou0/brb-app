import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { apiFetch } from '../../lib/api'
import type { ApiSuccess, OwnLeaveRequest } from '@/types/api'
import { useAuth } from '../../lib/auth'
import PageHeader from '../../components/PageHeader'
import {
  TABLE_ROW_HEIGHT,
  TableEmptyState,
  TableErrorState,
  TableLoadingState,
} from '@/components/states'

const COLUMN_COUNT = 3

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
    apiFetch<ApiSuccess<OwnLeaveRequest[]>>(
      `/api/leave-requests/status/${user.id}`
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

  return (
    <div data-testid="screen-my-requests">
      <PageHeader
        title="My requests"
        description="Your time-off request history."
      />
      <Link to="/employee/my-requests/new">New request</Link>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Dates</th>
            <th>Status</th>
          </tr>
        </thead>
        {error ? (
          <TableErrorState
            columns={COLUMN_COUNT}
            error={error}
            onRetry={retry}
            fallbackMessage="Failed to load your requests"
          />
        ) : requests === null ? (
          <TableLoadingState
            columns={COLUMN_COUNT}
            label="Loading your requests"
          />
        ) : requests.length === 0 ? (
          <TableEmptyState
            columns={COLUMN_COUNT}
            message="You have not requested any time off yet."
            action={<Link to="/employee/my-requests/new">New request</Link>}
          />
        ) : (
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} style={{ height: TABLE_ROW_HEIGHT }}>
                <td>{r.leave_type}</td>
                <td>
                  {r.start_date} – {r.end_date}
                </td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  )
}
