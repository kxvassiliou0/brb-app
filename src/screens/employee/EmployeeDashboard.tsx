import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import DataTable, { type DataTableColumn } from '@/components/DataTable'
import LinkButton from '@/components/LinkButton'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import StatusPill from '@/components/StatusPill'
import { ErrorState, LoadingState } from '@/components/states'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  countDays,
  countLabel,
  formatDateRange,
  formatToday,
} from '@/lib/dates'
import { greetByName } from '@/lib/greeting'
import { recentRequests, summariseRequests } from '@/lib/leaveSummary'
import { LEAVE_YEAR_LABEL, LEAVE_YEAR_RESET_LABEL } from '@/lib/leaveYear'
import { seasonalBackground } from '@/lib/seasonalBackground'
import type {
  ApiSuccess,
  OwnLeaveRequest,
  RemainingLeave,
  UserProfile,
} from '@/types/api'

const VIEW_ALL_LINK =
  'touch-target inline-flex items-center rounded-full px-3 text-base font-medium text-text-primary underline decoration-1 underline-offset-4 hover:bg-background-tertiary'

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [remaining, setRemaining] = useState<RemainingLeave | null>(null)
  const [requests, setRequests] = useState<OwnLeaveRequest[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setRemaining(null)
    setRequests(null)
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    apiFetch<ApiSuccess<UserProfile>>('/api/users/me')
      .then((res) => {
        if (!cancelled) setProfile(res.data)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })

    Promise.all([
      apiFetch<ApiSuccess<RemainingLeave>>(
        `/api/leave-requests/remaining/${user.id}`
      ),
      apiFetch<ApiSuccess<OwnLeaveRequest[]>>(
        `/api/leave-requests/status/${user.id}`
      ),
    ])
      .then(([balance, history]) => {
        if (cancelled) return
        setRemaining(balance.data)
        setRequests(history.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })

    return () => {
      cancelled = true
    }
  }, [user, attempt])

  const columns = useMemo<DataTableColumn<OwnLeaveRequest>[]>(
    () => [
      { key: 'type', header: 'Type', cell: (r) => r.leave_type },
      {
        key: 'dates',
        header: 'Dates',
        cell: (r) => formatDateRange(r.start_date, r.end_date),
      },
      {
        key: 'days',
        header: 'Days',
        cell: (r) => countDays(r.start_date, r.end_date),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (r) => <StatusPill status={r.status} />,
      },
    ],
    []
  )

  const summary = useMemo(() => summariseRequests(requests ?? []), [requests])

  const recent = useMemo(() => recentRequests(requests ?? []), [requests])

  return (
    <div
      data-testid="screen-employee-dashboard"
      className="flex flex-col gap-6"
    >
      <PageHeader
        title={greetByName(profile?.firstName)}
        description={`${formatToday()} • ${LEAVE_YEAR_LABEL}`}
        action={
          <LinkButton to="/employee/book-time-off">Book time off</LinkButton>
        }
      />

      {error ? (
        <ErrorState
          error={error}
          onRetry={retry}
          fallbackMessage="Failed to load your dashboard"
        />
      ) : remaining === null || requests === null ? (
        <LoadingState label="Loading your dashboard" />
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Remaining leave"
              value={countLabel(remaining.days_remaining, 'day')}
              hint={`of ${remaining.annual_allowance} annual allowance`}
            />
            <StatCard
              label="Booked this year"
              value={countLabel(remaining.days_used, 'day')}
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

          <section
            aria-labelledby="recent-requests-heading"
            className="rounded-2xl border border-border-primary bg-background-secondary p-4 sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 id="recent-requests-heading" className="text-xl md:text-2xl">
                My requests
              </h2>
              <Link to="/employee/my-requests" className={VIEW_ALL_LINK}>
                View all
              </Link>
            </div>
            <DataTable
              caption="My most recent time-off requests"
              columns={columns}
              rows={recent}
              rowKey={(r) => r.id}
              emptyMessage="You have not requested any time off yet, so there is nothing to summarise."
              emptyAction={
                <LinkButton to="/employee/book-time-off">
                  Book time off
                </LinkButton>
              }
            />
          </section>

          <section className="flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-border-primary bg-background-secondary">
            <div className="flex min-w-0 flex-col items-start gap-4 p-4 sm:p-6">
              <h2 className="text-xl md:text-2xl">
                You have {countLabel(remaining.days_remaining, 'day')} left.
                Plan your next escape
              </h2>
              <LinkButton to="/employee/book-time-off">
                Book time off
              </LinkButton>
            </div>
            <img
              src={seasonalBackground()}
              alt=""
              aria-hidden="true"
              className="hidden h-44 w-2/5 shrink-0 object-cover lg:block"
            />
          </section>
        </>
      )}
    </div>
  )
}
