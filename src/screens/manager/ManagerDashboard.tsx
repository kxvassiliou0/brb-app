import { useAuth } from '@/lib/auth'
import BookTimeOffButton from '@/components/BookTimeOffButton'
import { ErrorState, LoadingState } from '@/components/states'
import LinkButton from '@/components/LinkButton'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import { REQUESTS_PATH } from '@/lib/routeAccess'
import { useApiResource } from '@/lib/useApiResource'
import type { ApiSuccess } from '@/types/api'

export default function ManagerDashboard() {
  const { user } = useAuth()
  const { data, error, retry } = useApiResource<ApiSuccess<unknown[]>>(
    user ? `/api/leave-requests/pending/manager/${user.id}` : null
  )

  const pendingCount = data === null ? null : data.data.length

  return (
    <div data-testid="screen-manager-dashboard">
      <PageHeader
        title="Manager dashboard"
        description="Overview of your team's activity."
        action={
          <div className="flex flex-wrap gap-3">
            <LinkButton to={REQUESTS_PATH} variant="secondary">
              Review requests
            </LinkButton>
            <BookTimeOffButton onBooked={retry} />
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
    </div>
  )
}
