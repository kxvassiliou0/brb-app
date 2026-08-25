import { useCallback, useEffect, useMemo, useState } from 'react'
import BookingConfirmation, {
  useBookingConfirmation,
} from '@/components/BookingConfirmation'
import BookTimeOffButton from '@/components/BookTimeOffButton'
import ConfirmDialog from '@/components/ConfirmDialog'
import DeclineRequestModal from '@/components/DeclineRequestModal'
import PageHeader from '@/components/PageHeader'
import RequestDateStrip from '@/components/RequestDateStrip'
import RequestDetailsModal from '@/components/RequestDetailsModal'
import RequestsTable from '@/components/RequestsTable'
import RequestsToolbar from '@/components/RequestsToolbar'
import ReviewRequestModal from '@/components/ReviewRequestModal'
import SegmentedControl from '@/components/SegmentedControl'
import { cachedGet } from '@/lib/apiCache'
import { useAuth } from '@/lib/auth'
import {
  cancelErrorMessage,
  cancelRequest,
  CONFIRM_CANCEL_LABEL,
  KEEP_REQUEST_LABEL,
} from '@/lib/cancelRequest'
import { countLabel, formatDateRange } from '@/lib/dates'
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
import { remainingLeavePath } from '@/lib/teamBalances'
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
  const isAdminUser = isAdmin(user?.role)

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
  const [decliningId, setDecliningId] = useState<number | null>(null)
  const [detailsId, setDetailsId] = useState<number | null>(null)
  const [reviewBalance, setReviewBalance] = useState<RemainingLeave | null>(
    null
  )
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [pendingCancelId, setPendingCancelId] = useState<number | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

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
      cachedGet<ApiSuccess<RemainingLeave>>(remainingLeavePath(user.id), force),
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
    if (!user || !canReview) return
    let cancelled = false
    const force = attempt > 0

    const path = isAdminUser
      ? '/api/leave-requests'
      : `/api/leave-requests/pending/manager/${user.id}`

    cachedGet<ApiSuccess<LeaveRequest[]>>(path, force)
      .then((res) => {
        if (!cancelled) setTeam(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })

    if (isAdminUser) {
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
  }, [user, canReview, isAdminUser, attempt])

  const showingTeam = canReview && scope === 'all'

  const showingApprovalQueue = showingTeam && !isAdminUser

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

  const declining = (team ?? []).find((row) => row.id === decliningId) ?? null

  const details = (own ?? []).find((row) => row.id === detailsId) ?? null

  const openReview = useCallback((requestId: number) => {
    setReviewBalance(null)
    setReviewingId(requestId)
  }, [])

  useEffect(() => {
    if (reviewing === null) return
    let cancelled = false

    cachedGet<ApiSuccess<RemainingLeave>>(
      remainingLeavePath(reviewing.employee_id)
    )
      .then((res) => {
        if (!cancelled) setReviewBalance(res.data)
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

  const changeScope = useCallback((next: ScopeFilter) => {
    setScope(next)
    setFilters(EMPTY_FILTERS)
  }, [])

  const handleDecide = useCallback(
    (action: ReviewAction, requestId: number) => {
      if (action === 'reject') {
        setDecliningId(requestId)
        return
      }
      setDeciding(requestId)
      setError(null)
      decideRequest(action, requestId)
        .then(() => refresh())
        .catch((err) => setError(err))
        .finally(() => setDeciding(null))
    },
    [refresh]
  )

  const askToCancel = useCallback((requestId: number) => {
    setCancelError(null)
    setPendingCancelId(requestId)
  }, [])

  const closeCancelDialog = useCallback(() => {
    setPendingCancelId(null)
    setCancelError(null)
  }, [])

  const confirmCancel = useCallback(() => {
    if (pendingCancelId === null) return
    const requestId = pendingCancelId
    setCancellingId(requestId)
    setCancelError(null)

    cancelRequest(requestId)
      .then((result) => {
        const markCancelled = <T extends RequestRow>(list: T[] | null) =>
          list === null
            ? null
            : list.map((row) =>
                row.id === requestId ? { ...row, status: result.status } : row
              )

        setOwn(markCancelled)
        setTeam(markCancelled)

        if (result.new_days_remaining !== undefined) {
          const daysRemaining = result.new_days_remaining
          setBalance((current) =>
            current === null
              ? current
              : {
                  ...current,
                  days_remaining: daysRemaining,
                  days_used: current.annual_allowance - daysRemaining,
                }
          )
        }

        setPendingCancelId(null)
      })
      .catch((err: unknown) => setCancelError(cancelErrorMessage(err)))
      .finally(() => setCancellingId(null))
  }, [pendingCancelId])

  const cancelTarget = (own ?? []).find((row) => row.id === pendingCancelId)

  function describe(): string {
    if (showingApprovalQueue) {
      return (
        countLabel((team ?? []).length, 'request') + ' awaiting your approval'
      )
    }
    if (showingTeam) {
      const noun = isAdminUser ? 'request' : 'team request'
      return `${countLabel(countInLeaveYear(team ?? []), noun)} this year • ${countPending(team ?? [])} pending review`
    }
    const remaining = balance
      ? `${balance.days_remaining} days remaining of ${balance.annual_allowance}`
      : 'balance unavailable'
    return `${countLabel(countInLeaveYear(own ?? []), 'request')} this year • ${remaining}`
  }

  const title = !showingTeam
    ? 'My requests'
    : isAdminUser
      ? 'All requests'
      : 'Team requests'

  return (
    <div data-testid="screen-requests">
      <PageHeader
        title={title}
        description={describe()}
        action={<BookTimeOffButton onBooked={refresh} />}
      />

      <BookingConfirmation message={bookingConfirmation ?? null} />

      <div className="mb-4">
        <RequestsToolbar
          filters={filters}
          onChange={patchFilters}
          onClear={clearFilters}
          showSearch={showingTeam}
          showDepartments={showingTeam && isAdminUser}
          departments={departments}
          canClear={hasActiveFilters(filters)}
          trailing={
            canReview ? (
              <SegmentedControl
                label="Whose requests to show"
                testId="scope-filter"
                variant="slider"
                options={SCOPE_OPTIONS}
                value={scope}
                onChange={changeScope}
              />
            ) : null
          }
        />
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-background-secondary p-4 sm:p-6">
        {!showingApprovalQueue && (
          <SegmentedControl
            label="Filter by status"
            testId="status-filter"
            variant="tabs"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(status: StatusFilter) => patchFilters({ status })}
          />
        )}

        {showingTeam && <RequestDateStrip highlighted={highlightedDates} />}

        <RequestsTable
          rows={visible}
          error={error}
          onRetry={refresh}
          showEmployee={showingTeam}
          showReviewer={showingTeam && isAdminUser}
          onDecide={showingTeam ? handleDecide : null}
          onCancel={showingTeam ? null : askToCancel}
          onOpen={showingTeam ? openReview : setDetailsId}
          decidingId={deciding}
          cancellingId={cancellingId}
          highlightRequestId={bookingRequestId ?? null}
          emptyMessage={
            showingApprovalQueue
              ? 'Nothing is waiting for your approval.'
              : hasActiveFilters(filters)
                ? 'No requests match these filters.'
                : showingTeam
                  ? 'No requests to review yet.'
                  : "You haven't submitted any time-off requests. Book your first trip to get started!"
          }
          emptyAction={
            showingTeam ? null : <BookTimeOffButton onBooked={refresh} />
          }
        />
      </div>

      {details && (
        <RequestDetailsModal
          request={details}
          onClose={() => setDetailsId(null)}
        />
      )}

      {declining && (
        <DeclineRequestModal
          request={declining}
          noteLabel={isAdminUser ? 'Admin note' : 'Manager note'}
          onClose={() => setDecliningId(null)}
          onDeclined={refresh}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Cancel this request?"
          description="This request will be withdrawn and can not be reinstated."
          details={
            <dl className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-sm text-text-secondary">Dates</dt>
                <dd className="text-right font-medium text-text-primary">
                  {formatDateRange(
                    cancelTarget.start_date,
                    cancelTarget.end_date
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-sm text-text-secondary">Duration</dt>
                <dd className="text-right font-medium text-text-primary">
                  {countLabel(cancelTarget.days_requested, 'day')}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-sm text-text-secondary">Leave type</dt>
                <dd className="text-right font-medium text-text-primary">
                  {cancelTarget.leave_type}
                </dd>
              </div>
            </dl>
          }
          consequence="The days return to your allowance and your manager will no longer be asked to review it."
          confirmLabel={CONFIRM_CANCEL_LABEL}
          cancelLabel={KEEP_REQUEST_LABEL}
          error={cancelError}
          busy={cancellingId === cancelTarget.id}
          onConfirm={confirmCancel}
          onClose={closeCancelDialog}
        />
      )}

      {reviewing && (
        <ReviewRequestModal
          request={reviewing}
          team={team ?? []}
          balance={reviewBalance}
          onClose={() => setReviewingId(null)}
          onReviewed={refresh}
        />
      )}
    </div>
  )
}
