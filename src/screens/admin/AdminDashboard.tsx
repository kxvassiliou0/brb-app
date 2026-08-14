import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { ErrorState, LoadingState } from '@/components/states'
import PageHeader from '../../components/PageHeader'
import StatCard from '@/components/StatCard'

interface Counts {
  users: number
  departments: number
  leaveRequests: number
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setCounts(null)
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

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
        if (!cancelled) setError(err)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  return (
    <div data-testid="screen-admin-dashboard">
      <PageHeader
        title="Admin dashboard"
        description="Overview of organization-wide activity."
      />
      {error ? (
        <ErrorState
          error={error}
          onRetry={retry}
          fallbackMessage="Failed to load dashboard data"
        />
      ) : counts === null ? (
        <LoadingState label="Loading dashboard data" />
      ) : (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Employees" value={counts.users} />
          <StatCard label="Departments" value={counts.departments} />
          <StatCard label="Leave requests" value={counts.leaveRequests} />
        </dl>
      )}
    </div>
  )
}
