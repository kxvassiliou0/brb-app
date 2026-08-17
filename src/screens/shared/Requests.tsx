import { useCallback, useEffect, useMemo, useState } from 'react'
import BookingConfirmation, {
  useBookingConfirmation,
} from '@/components/BookingConfirmation'
import BookTimeOffButton from '@/components/BookTimeOffButton'
import PageHeader from '@/components/PageHeader'
import RequestDateStrip from '@/components/RequestDateStrip'
import RequestsTable from '@/components/RequestsTable'
import RequestsToolbar from '@/components/RequestsToolbar'
import ReviewRequestModal from '@/components/ReviewRequestModal'
import SegmentedControl from '@/components/SegmentedControl'
import { cachedGet } from '@/lib/apiCache'
import { useAuth } from '@/lib/auth'
import { countLabel } from '@/lib/dates'
import {
  countInLeaveYear,
  countPending,
  EMPTY_FILTERS,
  filterRequests,
  hasActiveFilters,
  requestedDates,
  STATUS_FILTERS,
  type RequestFilters,
  type RequestRow,
  type ScopeFilter,
  type StatusFilter,
} from '@/lib/requestFilters'
import { canReviewRequests, isAdmin } from '@/lib/routeAccess'
import { decideRequest, type ReviewAction } from '@/lib/reviewRequest'
import type {
  ApiSuccess,
  DepartmentRow,
  LeaveRequest,
  OwnLeaveRequest,
  RemainingLeave,
} from '@/types/api'

const SCOPE_OPTIONS = [
  { value: 'all' as ScopeFilter, label: 'All' },
  { value: 'mine' as ScopeFilter, label: 'My requests' },
]

const STATUS_OPTIONS = STATUS_FILTERS.map((status) => ({
  value: status,
  label: status,
}))

export default function Requests() {
  const { user } = useAuth()
  const { bookingConfirmation, bookingRequestId } = useBookingConfirmation()
  const canReview = canReviewRequests(user?.role)
  const canFilterByDepartment = isAdmin(user?.role)

  const [scope, setScope] = useState<ScopeFilter>(canReview ? 'all' : 'mine')
  const [filters, setFilters] = useState<RequestFilters>(EMPTY_FILTERS)
  const [attempt, setAttempt] = useState(0)

  const [own, setOwn] = useState<OwnLeaveRequest[] | null>(null)
  const [team, setTeam] = useState<LeaveRequest[] | null>(null)
  const [balance, setBalance] = useState<RemainingLeave | null>(null)
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [error, setError] = useState<unknown>(null)
  const [deciding, setDeciding] = useState<number | null>(null)
  const [reviewingId, setReviewingId] = useState<number | null>(null)
  const [reviewBalance, setReviewBalance] = useState<number | null>(null)

  const refresh = useCallback(() => {
    setOwn(null)
    setTeam(null)
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const force = attempt > 0

    Promise.all([
      cachedGet<ApiSuccess<OwnLeaveRequest[]>>(
        `/api/leave-requests/status/${user.id}`,
        force
      ),
      cachedGet<ApiSuccess<RemainingLeave>>(
        `/api/leave-requests/remaining/${user.id}`,
        force
      ),
    ])
      .then(([requests, remaining]) => {
        if (cancelled) return
        setOwn(requests.data)
        setBalance(remaining.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })

    return () => {
      cancelled = true
    }
  }, [user, attempt])

  useEffect(() => {
    if (!canReview) return
    let cancelled = false
    const force = attempt > 0

    cachedGet<ApiSuccess<LeaveRequest[]>>('/api/leave-requests', force)
      .then((res) => {
        if (!cancelled) setTeam(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })

    if (canFilterByDepartment) {
      cachedGet<ApiSuccess<DepartmentRow[]>>('/api/departments', force)
        .then((res) => {
          if (!cancelled) setDepartments(res.data)
        })
        .catch(() => {
          if (!cancelled) setDepartments([])
        })
    }

    return () => {
      cancelled = true
    }
  }, [canReview, canFilterByDepartment, attempt])

  const showingTeam = canReview && scope === 'all'

  const source: RequestRow[] | null = showingTeam ? team : own

  const visible = useMemo(
    () => (source === null ? null : filterRequests(source, filters)),
    [source, filters]
  )

  const highlightedDates = useMemo(
    () => requestedDates(visible ?? []),
    [visible]
  )

  const reviewing = (team ?? []).find((row) => row.id === reviewingId) ?? null

  const openReview = useCallback((requestId: number) => {
    setReviewBalance(null)
    setReviewingId(requestId)
  }, [])

  useEffect(() => {
    if (reviewing === null) return
    let cancelled = false

    cachedGet<ApiSuccess<RemainingLeave>>(
      `/api/leave-requests/remaining/${reviewing.employee_id}`
    )
      .then((res) => {
        if (!cancelled) {
          setReviewBalance(res.data.days_remaining - reviewing.days_requested)
        }
      })
      .catch(() => {
        if (!cancelled) setReviewBalance(null)
      })

    return () => {
      cancelled = true
    }
  }, [reviewing])

  const patchFilters = useCallback((patch: Partial<RequestFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
  }, [])

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const handleDecide = useCallback(
    (action: ReviewAction, requestId: number) => {
      setDeciding(requestId)
      setError(null)
      decideRequest(action, requestId)
        .then(() => refresh())
        .catch((err) => setError(err))
        .finally(() => setDeciding(null))
    },
    [refresh]
  )

  const description = showingTeam
    ? `${countLabel(countInLeaveYear(team ?? []), 'team request')} this year • ${countPending(team ?? [])} pending review`
    : `${countLabel(countInLeaveYear(own ?? []), 'request')} this year • ${
        balance
          ? `${balance.days_remaining} days remaining of ${balance.annual_allowance}`
          : 'balance unavailable'
      }`

  const title = showingTeam ? 'Team requests' : 'My requests'

  return (
    <div data-testid="screen-requests">
      <PageHeader
        title={title}
        description={description}
        action={<BookTimeOffButton onBooked={refresh} />}
      />

      <BookingConfirmation message={bookingConfirmation ?? null} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <RequestsToolbar
          filters={filters}
          onChange={patchFilters}
          onClear={clearFilters}
          showSearch={showingTeam}
          showDepartments={showingTeam && canFilterByDepartment}
          departments={departments}
          canClear={hasActiveFilters(filters)}
        />
        {canReview && (
          <SegmentedControl
            label="Whose requests to show"
            testId="scope-filter"
            variant="slider"
            options={SCOPE_OPTIONS}
            value={scope}
            onChange={setScope}
          />
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-background-secondary p-4 sm:p-6">
        <SegmentedControl
          label="Filter by status"
          testId="status-filter"
          variant="tabs"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(status: StatusFilter) => patchFilters({ status })}
        />

        {showingTeam && <RequestDateStrip highlighted={highlightedDates} />}

        <RequestsTable
          rows={visible}
          error={error}
          onRetry={refresh}
          showEmployee={showingTeam}
          onDecide={showingTeam ? handleDecide : null}
          onOpen={openReview}
          decidingId={deciding}
          highlightRequestId={bookingRequestId ?? null}
          emptyMessage={
            showingTeam
              ? 'No requests to review yet.'
              : hasActiveFilters(filters)
                ? 'No requests match these filters.'
                : "You haven't submitted any time-off requests. Book your first trip to get started!"
          }
          emptyAction={
            showingTeam ? null : <BookTimeOffButton onBooked={refresh} />
          }
        />
      </div>

      {reviewing && (
        <ReviewRequestModal
          request={reviewing}
          team={team ?? []}
          balanceAfter={reviewBalance}
          onClose={() => setReviewingId(null)}
          onReviewed={refresh}
        />
      )}
    </div>
  )
}
