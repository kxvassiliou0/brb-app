import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { apiFetch } from '../../lib/api'
import type { ApiSuccess, LeaveRequest } from '@/types/api'
import PageHeader from '../../components/PageHeader'

export default function RequestsList({ basePath }: { basePath: string }) {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetch<ApiSuccess<LeaveRequest[]>>('/api/leave-requests')
      .then((res) => {
        if (!cancelled) setRequests(res.data)
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load requests'
          )
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div data-testid="screen-requests">
      <PageHeader
        title="Requests"
        description="Time-off requests awaiting review."
      />
      <Link to={`${basePath}/requests/new`}>New request</Link>
      {error && <p role="alert">{error}</p>}
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
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
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
      </table>
    </div>
  )
}
