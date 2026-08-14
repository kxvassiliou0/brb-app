import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { ErrorState, LoadingState } from '@/components/states'
import LinkButton from '@/components/LinkButton'
import PageHeader from '../../components/PageHeader'
import StatCard from '@/components/StatCard'

export default function ManagerDashboard() {
  const { user } = useAuth()
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setPendingCount(null)
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

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
        if (!cancelled) setError(err)
      })
    return () => {
      cancelled = true
    }
  }, [user, attempt])

  return (
    <div data-testid="screen-manager-dashboard">
      <PageHeader
        title="Manager dashboard"
        description="Overview of your team's activity."
        action={
          <LinkButton to="/manager/requests" variant="secondary">
            Review requests
          </LinkButton>
        }
      />
      {error ? (
        <ErrorState
          error={error}
          onRetry={retry}
          fallbackMessage="Failed to load dashboard data"
        />
      ) : pendingCount === null ? (
        <LoadingState label="Loading dashboard data" />
      ) : (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Pending requests" value={pendingCount} />
        </dl>
      )}
    </div>
  )
}
