import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { apiFetch } from '../../lib/api'
import type { ApiSuccess, OwnLeaveRequest } from '@/types/api'
import { useAuth } from '../../lib/auth'
import PageHeader from '../../components/PageHeader'

export default function MyRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<OwnLeaveRequest[]>([])
  const [error, setError] = useState<string | null>(null)

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
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load your requests'
          )
      })
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div data-testid="screen-my-requests">
      <PageHeader
        title="My requests"
        description="Your time-off request history."
      />
      <Link to="/employee/my-requests/new">New request</Link>
      {error && <p role="alert">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Dates</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td>{r.leave_type}</td>
              <td>
                {r.start_date} – {r.end_date}
              </td>
              <td>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
