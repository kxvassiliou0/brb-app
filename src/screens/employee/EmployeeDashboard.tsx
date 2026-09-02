import { useCallback, useMemo } from 'react'
import BookTimeOffButton from '@/components/requests/BookTimeOffButton'
import MyRequestsCard from '@/components/requests/MyRequestsCard'
import PlanEscapeBanner from '@/components/requests/PlanEscapeBanner'
import PageHeader from '@/components/layout/PageHeader'
import StatCard from '@/components/ui/StatCard'
import { ErrorState, LoadingState } from '@/components/ui/states'
import { getRemainingLeave, listRequestsFor } from '@/api/leaveRequests'
import { useResource } from '@/api/useResource'
import { getMyProfile } from '@/api/users'
import { useAuth } from '@/features/auth/auth'
import { countLabel, formatToday } from '@/lib/dates'
import { greetByName } from '@/lib/greeting'
import { summariseRequests } from '@/features/requests/leaveSummary'
import { LEAVE_YEAR_LABEL, LEAVE_YEAR_RESET_LABEL } from '@/lib/leaveYear'

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const userId = user?.id

  const profile = useResource(
    userId === undefined ? null : () => getMyProfile().catch(() => null),
    [userId]
  )

  const dashboard = useResource(
    userId === undefined
      ? null
      : async () => {
          const [remaining, requests] = await Promise.all([
            getRemainingLeave(userId),
            listRequestsFor(userId),
          ])
          return { remaining, requests }
        },
    [userId]
  )

  const retryProfile = profile.retry
  const retryDashboard = dashboard.retry
  const retry = useCallback(() => {
    retryProfile()
    retryDashboard()
  }, [retryProfile, retryDashboard])

  const requests = dashboard.data?.requests ?? null

  const summary = useMemo(() => summariseRequests(requests ?? []), [requests])

  return (
    <div
      data-testid="screen-employee-dashboard"
      className="flex flex-col gap-6"
    >
      <PageHeader
        title={greetByName(profile.data?.firstName)}
        description={`${formatToday()} • ${LEAVE_YEAR_LABEL}`}
        action={<BookTimeOffButton onBooked={retry} />}
      />

      {dashboard.error ? (
        <ErrorState
          error={dashboard.error}
          onRetry={retry}
          fallbackMessage="Failed to load your dashboard"
        />
      ) : dashboard.data === null ? (
        <LoadingState label="Loading your dashboard" />
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Remaining leave"
              value={countLabel(dashboard.data.remaining.days_remaining, 'day')}
              hint={`of ${dashboard.data.remaining.annual_allowance} annual allowance`}
            />
            <StatCard
              label="Booked this year"
              value={countLabel(dashboard.data.remaining.days_used, 'day')}
              hint={`across ${countLabel(summary.bookedRequests, 'request')}`}
            />
            <StatCard
              label="Pending approval"
              value={countLabel(summary.pendingRequests, 'request')}
              hint="awaiting your manager"
            />
            <StatCard
              label="Sick leave taken"
              value={countLabel(summary.sickDays, 'day')}
              hint={LEAVE_YEAR_RESET_LABEL}
            />
          </dl>

          <MyRequestsCard requests={dashboard.data.requests} onBooked={retry} />

          <PlanEscapeBanner
            daysRemaining={dashboard.data.remaining.days_remaining}
            onBooked={retry}
          />
        </>
      )}
    </div>
  )
}
