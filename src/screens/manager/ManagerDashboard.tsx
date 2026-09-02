import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  getRemainingLeave,
  listCalendar,
  listPendingForManager,
  listRequestsFor,
} from '@/api/leaveRequests'
import { listDepartments } from '@/api/orgUnits'
import { useResource } from '@/api/useResource'
import { getMyProfile } from '@/api/users'
import { initialsFromName } from '@/components/layout/UserSummary'
import PageHeader from '@/components/layout/PageHeader'
import BookTimeOffButton from '@/components/requests/BookTimeOffButton'
import DeclineRequestModal from '@/components/requests/DeclineRequestModal'
import MyRequestsCard from '@/components/requests/MyRequestsCard'
import PlanEscapeBanner from '@/components/requests/PlanEscapeBanner'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import StatCard from '@/components/ui/StatCard'
import { ErrorState, LoadingState } from '@/components/ui/states'
import { useAuth } from '@/features/auth/auth'
import { summariseTeam, teamThisWeek } from '@/features/manager/teamSummary'
import { decideRequest, REVIEW_LABEL } from '@/features/requests/reviewRequest'
import { countLabel, formatDateRange, formatToday } from '@/lib/dates'
import { greetByName } from '@/lib/greeting'
import { monthGridRange, monthOf } from '@/lib/calendar'
import { toIsoDate } from '@/lib/dates'
import { REQUESTS_PATH } from '@/lib/routeAccess'
import type { LeaveRequest } from '@/types/api'

async function loadDashboard(managerId: number) {
  const { from, to } = monthGridRange(monthOf(toIsoDate(new Date())))
  const [pending, calendar, departments, own, remaining] = await Promise.all([
    listPendingForManager(managerId),
    listCalendar(from, to).catch(() => []),
    listDepartments().catch(() => []),
    listRequestsFor(managerId),
    getRemainingLeave(managerId),
  ])
  return { pending, calendar, departments, own, remaining }
}

export default function ManagerDashboard() {
  const { user } = useAuth()
  const managerId = user?.id
  const [deciding, setDeciding] = useState<number | null>(null)
  const [declining, setDeclining] = useState<LeaveRequest | null>(null)

  const profile = useResource(
    managerId === undefined ? null : () => getMyProfile().catch(() => null),
    [managerId]
  )

  const dashboard = useResource(
    managerId === undefined ? null : () => loadDashboard(managerId),
    [managerId]
  )

  const retryProfile = profile.retry
  const retryDashboard = dashboard.retry
  const refresh = useCallback(() => {
    retryProfile()
    retryDashboard()
  }, [retryProfile, retryDashboard])

  const data = dashboard.data
  const summary = useMemo(
    () => (data ? summariseTeam(data.pending, data.calendar) : null),
    [data]
  )
  const thisWeek = useMemo(
    () => (data ? teamThisWeek(data.calendar, data.departments) : []),
    [data]
  )

  const approve = useCallback(
    async (requestId: number) => {
      setDeciding(requestId)
      try {
        await decideRequest('approve', requestId)
        refresh()
      } finally {
        setDeciding(null)
      }
    },
    [refresh]
  )

  const columns = useMemo<DataTableColumn<LeaveRequest>[]>(
    () => [
      {
        key: 'employee',
        header: 'Employee',
        cell: (r) => r.employee_name ?? `#${r.employee_id}`,
      },
      {
        key: 'dates',
        header: 'Dates',
        cell: (r) => (
          <span className="whitespace-nowrap">
            {formatDateRange(r.start_date, r.end_date)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Status',
        align: 'right',
        hideCardLabel: true,
        cell: (r) => (
          <div className="flex items-center justify-end">
            <Button
              variant="ghostDanger"
              disabled={deciding === r.id}
              onClick={() => setDeclining(r)}
            >
              <Icon name="cross" />
              <span className="sr-only">{REVIEW_LABEL.reject}</span>
            </Button>
            <Button
              variant="ghost"
              disabled={deciding === r.id}
              onClick={() => approve(r.id)}
            >
              <Icon name="check" />
              <span className="sr-only">{REVIEW_LABEL.approve}</span>
            </Button>
          </div>
        ),
      },
    ],
    [approve, deciding]
  )

  return (
    <div data-testid="screen-manager-dashboard" className="flex flex-col gap-4">
      <PageHeader
        title={greetByName(profile.data?.firstName)}
        description={`${formatToday()} • ${
          summary === null
            ? 'your team at a glance'
            : `${countLabel(summary.pending, 'request')} need your review`
        }`}
        action={<BookTimeOffButton onBooked={refresh} />}
      />

      {dashboard.error ? (
        <ErrorState
          error={dashboard.error}
          onRetry={refresh}
          fallbackMessage="Failed to load dashboard data"
        />
      ) : data === null || summary === null ? (
        <LoadingState label="Loading dashboard data" />
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Pending approvals"
              value={countLabel(summary.pending, 'request')}
              hint={`${summary.urgent} starting this week`}
            />
            <StatCard
              label="On leave today"
              value={`${summary.onLeaveToday} ${summary.onLeaveToday === 1 ? 'person' : 'people'}`}
              hint={`of ${summary.teamSize} in your team`}
            />
            <StatCard
              label="Team coverage"
              value={`${summary.coveragePercent}%`}
              hint="healthy this week"
            />
            <StatCard
              label="Approved this month"
              value={countLabel(summary.approvedThisMonth, 'request')}
              hint="across your team"
            />
          </dl>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <Card
                variant="bordered"
                size="sm"
                testId="approvals-queue"
                labelledBy="approvals-queue-heading"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2
                    id="approvals-queue-heading"
                    className="text-xl md:text-2xl"
                  >
                    Approvals queue
                  </h2>
                  <Link
                    to={REQUESTS_PATH}
                    className="touch-target inline-flex items-center rounded-full px-3 text-base font-medium text-text-primary underline decoration-1 underline-offset-4 hover:bg-background-tertiary"
                  >
                    View all
                  </Link>
                </div>
                <DataTable
                  caption="Requests from your team awaiting your review"
                  columns={columns}
                  rows={data.pending}
                  rowKey={(r) => r.id}
                  emptyMessage="Nobody on your team is waiting on a decision."
                />
              </Card>

              <PlanEscapeBanner
                daysRemaining={data.remaining.days_remaining}
                onBooked={refresh}
              />
            </div>

            <div className="flex flex-col gap-4">
              <Card
                variant="bordered"
                size="sm"
                testId="team-this-week"
                labelledBy="team-this-week-heading"
              >
                <h2
                  id="team-this-week-heading"
                  className="mb-4 text-xl md:text-2xl"
                >
                  Your team this week
                </h2>
                {thisWeek.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    Nobody on your team is off this week.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {thisWeek.map((member) => (
                      <li
                        key={`${member.employee_id}-${member.start_date}`}
                        data-testid="team-week-member"
                        className="flex items-center justify-between gap-3 border-b border-border-primary py-3 last:border-b-0"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-background text-sm font-semibold text-sage-foreground"
                          >
                            {initialsFromName(member.name)}
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-medium text-text-primary">
                              {member.name}
                            </span>
                            {member.department_name && (
                              <span className="truncate text-sm text-text-secondary">
                                {member.department_name}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm whitespace-nowrap text-text-secondary">
                          {formatDateRange(member.start_date, member.end_date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <MyRequestsCard requests={data.own} onBooked={refresh} />
            </div>
          </div>
        </>
      )}

      {declining && (
        <DeclineRequestModal
          request={declining}
          noteLabel="Reason for declining"
          onClose={() => setDeclining(null)}
          onDeclined={refresh}
        />
      )}
    </div>
  )
}
