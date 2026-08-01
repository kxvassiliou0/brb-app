import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import PageHeader from '../../components/PageHeader'

export default function ManagerDashboard() {
  const { user } = useAuth()
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    apiFetch<{ data: unknown[] }>(
      `/api/leave-requests/pending/manager/${user.id}`
    )
      .then((res) => {
        if (!cancelled) setPendingCount(res.data.length)
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
  }, [user])

  return (
    <div data-testid="screen-manager-dashboard">
      <PageHeader
        title="Manager dashboard"
        description="Overview of your team's activity."
      />
      {error && <p role="alert">{error}</p>}
      {pendingCount !== null && <p>Pending requests: {pendingCount}</p>}
    </div>
  )
}
