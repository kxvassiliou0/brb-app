import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import type { ApiSuccess, RemainingLeave } from '@/types/api'
import { useAuth } from '../../lib/auth'
import { ErrorState, LoadingState } from '@/components/states'
import LinkButton from '@/components/LinkButton'
import PageHeader from '../../components/PageHeader'
import StatCard from '@/components/StatCard'

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [remaining, setRemaining] = useState<RemainingLeave | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setRemaining(null)
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    apiFetch<ApiSuccess<RemainingLeave>>(
      `/api/leave-requests/remaining/${user.id}`
    )
      .then((res) => {
        if (!cancelled) setRemaining(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
    return () => {
      cancelled = true
    }
  }, [user, attempt])

  return (
    <div data-testid="screen-employee-dashboard">
      <PageHeader
        title="My dashboard"
        description="Your time-off balance."
        action={
          <LinkButton to="/employee/book-time-off">Book time off</LinkButton>
        }
      />
      {error ? (
        <ErrorState
          error={error}
          onRetry={retry}
          fallbackMessage="Failed to load leave balance"
        />
      ) : remaining === null ? (
        <LoadingState label="Loading leave balance" />
      ) : (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Annual allowance"
            value={remaining.annual_allowance}
          />
          <StatCard label="Days used" value={remaining.days_used} />
          <StatCard label="Days remaining" value={remaining.days_remaining} />
        </dl>
      )}
    </div>
  )
}
