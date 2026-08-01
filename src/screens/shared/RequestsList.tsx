import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { apiFetch } from '../../lib/api'
import PageHeader from '../../components/PageHeader'

export interface LeaveRow {
  id: number
  employee_id: number
  leave_type: string
  start_date: string
  end_date: string
  status: string
  reason: string | null
}

export default function RequestsList({ basePath }: { basePath: string }) {
  const [requests, setRequests] = useState<LeaveRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetch<{ data: LeaveRow[] }>('/api/leave-requests')
      .then((res) => {
        if (!cancelled) setRequests(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load requests')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div data-testid="screen-requests">
      <PageHeader title="Requests" description="Time-off requests awaiting review." />
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
                <Link to={`${basePath}/requests/${r.id}`} state={{ request: r }}>
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
