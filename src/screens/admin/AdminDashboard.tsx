import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import PageHeader from '../../components/PageHeader'

interface Counts {
  users: number
  departments: number
  leaveRequests: number
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiFetch<{ data: unknown[] }>('/api/users'),
      apiFetch<{ data: unknown[] }>('/api/departments'),
      apiFetch<{ data: unknown[] }>('/api/leave-requests'),
    ])
      .then(([users, departments, leaveRequests]) => {
        if (!cancelled) {
          setCounts({
            users: users.data.length,
            departments: departments.data.length,
            leaveRequests: leaveRequests.data.length,
          })
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load dashboard data'
          )
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div data-testid="screen-admin-dashboard">
      <PageHeader
        title="Admin dashboard"
        description="Overview of organization-wide activity."
      />
      {error && <p role="alert">{error}</p>}
      {counts && (
        <ul>
          <li>Employees: {counts.users}</li>
          <li>Departments: {counts.departments}</li>
          <li>Leave requests: {counts.leaveRequests}</li>
        </ul>
      )}
    </div>
  )
}
