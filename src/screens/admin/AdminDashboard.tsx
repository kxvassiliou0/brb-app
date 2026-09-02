import { useCallback } from 'react'
import {
  getLeaveUsageReport,
  getRemainingLeave,
  listAllRequests,
  listRequestsFor,
} from '@/api/leaveRequests'
import { listUsers, getMyProfile } from '@/api/users'
import { useResource } from '@/api/useResource'
import PageHeader from '@/components/layout/PageHeader'
import BookTimeOffButton from '@/components/requests/BookTimeOffButton'
import MyRequestsCard from '@/components/requests/MyRequestsCard'
import PlanEscapeBanner from '@/components/requests/PlanEscapeBanner'
import Card from '@/components/ui/Card'
import StatCard from '@/components/ui/StatCard'
import { ErrorState, LoadingState } from '@/components/ui/states'
import { summariseOrganisation } from '@/features/admin/orgSummary'
import { useAuth } from '@/features/auth/auth'
import { countLabel, formatToday } from '@/lib/dates'
import { greetByName } from '@/lib/greeting'
import { getLeaveYear } from '@/lib/leaveYear'

async function loadDashboard(userId: number) {
  const leaveYear = getLeaveYear()
  const [users, requests, usage, own, remaining] = await Promise.all([
    listUsers(),
    listAllRequests(),
    getLeaveUsageReport(leaveYear.start, leaveYear.end),
    listRequestsFor(userId),
    getRemainingLeave(userId),
  ])
  return {
    summary: summariseOrganisation(users, requests, usage),
    own,
    remaining,
  }
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const userId = user?.id

  const profile = useResource(
    userId === undefined ? null : () => getMyProfile().catch(() => null),
    [userId]
  )

  const dashboard = useResource(
    userId === undefined ? null : () => loadDashboard(userId),
    [userId]
  )

  const retryProfile = profile.retry
  const retryDashboard = dashboard.retry
  const retry = useCallback(() => {
    retryProfile()
    retryDashboard()
  }, [retryProfile, retryDashboard])

  const summary = dashboard.data?.summary ?? null
  const widest = summary?.byDepartment[0]?.days ?? 0

  return (
    <div data-testid="screen-admin-dashboard" className="flex flex-col gap-4">
      <PageHeader
        title={greetByName(profile.data?.firstName)}
        description={`${formatToday()} • your organisation at a glance`}
        action={<BookTimeOffButton onBooked={retry} />}
      />
      {dashboard.error ? (
        <ErrorState
          error={dashboard.error}
          onRetry={retry}
          fallbackMessage="Failed to load dashboard data"
        />
      ) : dashboard.data === null || summary === null ? (
        <LoadingState label="Loading dashboard data" />
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total employees"
              value={summary.employees}
              hint={`across ${countLabel(summary.departments, 'department')}`}
            />
            <StatCard
              label="Requests this month"
              value={summary.requestsThisMonth}
              hint={`${summary.pendingThisMonth} still pending`}
            />
            <StatCard
              label="On leave today"
              value={`${summary.onLeaveToday} ${summary.onLeaveToday === 1 ? 'person' : 'people'}`}
              hint={`${summary.staffOnLeavePercent}% of staff`}
            />
            <StatCard
              label="Avg leave taken"
              value={countLabel(summary.averageDaysPerEmployee, 'day')}
              hint="per employee"
            />
          </dl>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MyRequestsCard requests={dashboard.data.own} onBooked={retry} />

            <Card
              variant="bordered"
              size="sm"
              testId="leave-by-department"
              labelledBy="leave-by-department-heading"
            >
              <h2
                id="leave-by-department-heading"
                className="mb-4 text-xl md:text-2xl"
              >
                Leave by department
              </h2>
              <ul className="flex flex-col gap-4">
                {summary.byDepartment.map((department) => (
                  <li key={department.name} data-testid="department-leave">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span>{department.name}</span>
                      <span className="text-text-secondary">
                        {countLabel(department.days, 'day')}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-background-tertiary">
                      <div
                        className="h-2 rounded-full bg-sage-foreground"
                        style={{
                          width: `${widest === 0 ? 0 : Math.round((department.days / widest) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <PlanEscapeBanner
            daysRemaining={dashboard.data.remaining.days_remaining}
            onBooked={retry}
          />
        </>
      )}
    </div>
  )
}
