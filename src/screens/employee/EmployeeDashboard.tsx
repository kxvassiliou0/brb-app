import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import PageHeader from '../../components/PageHeader'

interface RemainingLeave {
  annual_allowance: number
  days_used: number
  days_remaining: number
}

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [remaining, setRemaining] = useState<RemainingLeave | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    apiFetch<{ data: RemainingLeave }>(`/api/leave-requests/remaining/${user.id}`)
      .then((res) => {
        if (!cancelled) setRemaining(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load leave balance')
      })
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div data-testid="screen-employee-dashboard">
      <PageHeader title="My dashboard" description="Your time-off balance." />
      {error && <p role="alert">{error}</p>}
      {remaining && (
        <ul>
          <li>Annual allowance: {remaining.annual_allowance}</li>
          <li>Days used: {remaining.days_used}</li>
          <li>Days remaining: {remaining.days_remaining}</li>
        </ul>
      )}
    </div>
  )
}
