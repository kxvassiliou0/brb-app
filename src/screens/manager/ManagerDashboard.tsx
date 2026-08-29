import { useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import BookTimeOffButton from '@/components/requests/BookTimeOffButton'
import { ErrorState, LoadingState } from '@/components/ui/states'
import LinkButton from '@/components/ui/LinkButton'
import PageHeader from '@/components/layout/PageHeader'
import StatCard from '@/components/ui/StatCard'
import TeamBalancesTable from '@/components/employees/TeamBalancesTable'
import { REQUESTS_PATH } from '@/lib/routeAccess'
import { useApiResource } from '@/lib/useApiResource'
import { useTeamBalances } from '@/lib/useTeamBalances'
import type { ApiSuccess } from '@/types/api'

export default function ManagerDashboard() {
  const { user } = useAuth()
  const { data, error, retry } = useApiResource<ApiSuccess<unknown[]>>(
    user ? `/api/leave-requests/pending/manager/${user.id}` : null
  )
  const balances = useTeamBalances(user?.id)

  const pendingCount = data === null ? null : data.data.length

  const refresh = useCallback(() => {
    retry()
    balances.retry()
  }, [retry, balances])

  return (
    <div data-testid="screen-manager-dashboard" className="flex flex-col gap-6">
      <PageHeader
        title="Manager dashboard"
        description="Overview of your team's activity."
        action={
          <div className="flex flex-wrap gap-3">
            <LinkButton to={REQUESTS_PATH} variant="secondary">
              Review requests
            </LinkButton>
            <BookTimeOffButton onBooked={refresh} />
          </div>
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

      <TeamBalancesTable
        rows={balances.rows}
        error={balances.error}
        onRetry={balances.retry}
      />
    </div>
  )
}
