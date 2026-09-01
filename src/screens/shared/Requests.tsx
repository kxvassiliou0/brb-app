import { useCallback, useEffect, useMemo, useState } from 'react'
import BookingConfirmation, {
  useBookingConfirmation,
} from '@/components/requests/BookingConfirmation'
import BookTimeOffButton from '@/components/requests/BookTimeOffButton'
import Button from '@/components/ui/Button'
import DetailRow from '@/components/ui/DetailRow'
import FormAlert from '@/components/ui/FormAlert'
import Modal from '@/components/ui/Modal'
import DeclineRequestModal from '@/components/requests/DeclineRequestModal'
import PageHeader from '@/components/layout/PageHeader'
import RequestDateStrip from '@/components/requests/RequestDateStrip'
import RequestDetailsModal from '@/components/requests/RequestDetailsModal'
import RequestsTable from '@/components/requests/RequestsTable'
import RequestsToolbar, {
  CLEAR_FILTERS_LABEL,
} from '@/components/requests/RequestsToolbar'
import ReviewRequestModal from '@/components/requests/ReviewRequestModal'
import SegmentedControl from '@/components/ui/SegmentedControl'
import {
  getRemainingLeave,
  listAllRequests,
  listPendingForManager,
  listRequestsFor,
} from '@/api/leaveRequests'
import { listDepartments } from '@/api/orgUnits'
import { useResource } from '@/api/useResource'
import { useAuth } from '@/features/auth/auth'
import {
  cancelErrorMessage,
  cancelRequest,
  CONFIRM_CANCEL_LABEL,
  KEEP_REQUEST_LABEL,
} from '@/features/requests/cancelRequest'
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
} from '@/features/requests/requestFilters'
import { canReviewRequests, isAdmin } from '@/lib/routeAccess'
import {
  decideRequest,
  type ReviewAction,
} from '@/features/requests/reviewRequest'
import type { RemainingLeave } from '@/types/api'

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
  const [deciding, setDeciding] = useState<number | null>(null)
  const [decideError, setDecideError] = useState<unknown>(null)
  const [reviewingId, setReviewingId] = useState<number | null>(null)
  const [decliningId, setDecliningId] = useState<number | null>(null)
  const [detailsId, setDetailsId] = useState<number | null>(null)
  const [reviewBalance, setReviewBalance] = useState<RemainingLeave | null>(
    null
  )
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [pendingCancelId, setPendingCancelId] = useState<number | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const userId = user?.id

  const mine = useResource(
    userId === undefined
      ? null
      : async () => {
          const [requests, remaining] = await Promise.all([
            listRequestsFor(userId),
            getRemainingLeave(userId),
          ])
          return { requests, remaining }
        },
    [userId]
  )

  const review = useResource(
    userId === undefined || !canReview
      ? null
      : async () => {
          const [requests, departments] = await Promise.all([
            isAdminUser ? listAllRequests() : listPendingForManager(userId),
            listDepartments().catch(() => []),
          ])
          return { requests, departments }
        },
    [userId, canReview, isAdminUser]
  )

  const own = mine.data?.requests ?? null
  const balance = mine.data?.remaining ?? null
  const team = review.data?.requests ?? null
  const departments = review.data?.departments ?? []
  const error = mine.error ?? review.error ?? decideError

  const retryMine = mine.retry
  const retryReview = review.retry
  const setMine = mine.setData
  const setReview = review.setData
  const refresh = useCallback(() => {
    retryMine()
    retryReview()
  }, [retryMine, retryReview])

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

    getRemainingLeave(reviewing.employee_id)
      .then((remaining) => {
        if (!cancelled) setReviewBalance(remaining)
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
      setDecideError(null)
      decideRequest(action, requestId)
        .then(() => refresh())
        .catch((err: unknown) => setDecideError(err))
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

        const daysRemaining = result.new_days_remaining

        setMine((current) =>
          current === null
            ? current
            : {
                requests: markCancelled(current.requests) ?? current.requests,
                remaining:
                  daysRemaining === undefined
                    ? current.remaining
                    : {
                        ...current.remaining,
                        days_remaining: daysRemaining,
                        days_used:
                          current.remaining.annual_allowance - daysRemaining,
                      },
              }
        )

        setReview((current) =>
          current === null
            ? current
            : {
                ...current,
                requests: markCancelled(current.requests) ?? current.requests,
              }
        )

        setPendingCancelId(null)
      })
      .catch((err: unknown) => setCancelError(cancelErrorMessage(err)))
      .finally(() => setCancellingId(null))
  }, [pendingCancelId, setMine, setReview])

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

  const filtering = hasActiveFilters(filters)

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
          showDepartments={showingTeam}
          departments={departments}
          canClear={filtering}
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
            filtering
              ? 'No requests match these filters.'
              : showingApprovalQueue
                ? 'Nothing is waiting for your approval.'
                : showingTeam
                  ? 'No requests to review yet.'
                  : "You haven't submitted any time-off requests. Book your first trip to get started!"
          }
          emptyAction={
            filtering ? (
              <Button variant="secondary" onClick={clearFilters}>
                {CLEAR_FILTERS_LABEL}
              </Button>
            ) : showingTeam ? null : (
              <BookTimeOffButton onBooked={refresh} />
            )
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
        <Modal
          title="Cancel this request?"
          onClose={closeCancelDialog}
          description="This request will be withdrawn and can not be reinstated."
          primary={{
            label: CONFIRM_CANCEL_LABEL,
            variant: 'danger',
            disabled: cancellingId === cancelTarget.id,
            onClick: confirmCancel,
          }}
          secondary={{
            label: KEEP_REQUEST_LABEL,
            disabled: cancellingId === cancelTarget.id,
          }}
        >
          <dl className="flex flex-col">
            <DetailRow
              label="Dates"
              value={formatDateRange(
                cancelTarget.start_date,
                cancelTarget.end_date
              )}
            />
            <DetailRow
              label="Duration"
              value={countLabel(cancelTarget.days_requested, 'day')}
            />
            <DetailRow label="Leave type" value={cancelTarget.leave_type} />
          </dl>

          <p className="text-sm text-text-secondary">
            The days return to your allowance and your manager will no longer be
            asked to review it.
          </p>

          {cancelError && <FormAlert message={cancelError} />}
        </Modal>
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
