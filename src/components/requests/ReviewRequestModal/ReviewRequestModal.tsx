import { useState } from 'react'
import DetailRow from '@/components/ui/DetailRow'
import FormAlert from '@/components/ui/FormAlert'
import Icon from '@/components/ui/Icon'
import Modal from '@/components/ui/Modal'
import { initialsFromName } from '@/components/layout/UserSummary'
import { countLabel, formatDate, formatDateRange } from '@/lib/dates'
import { overlappingNames } from '@/features/requests/requestFilters'
import { decideRequest, REVIEW_LABEL } from '@/features/requests/reviewRequest'
import type { LeaveRequest, RemainingLeave } from '@/types/api'

interface ReviewRequestModalProps {
  request: LeaveRequest
  team: LeaveRequest[]
  balance: RemainingLeave | null
  onClose: () => void
  onReviewed: () => void
}

export default function ReviewRequestModal({
  request,
  team,
  balance,
  onClose,
  onReviewed,
}: ReviewRequestModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const overlap = overlappingNames(team, request)
  const name = request.employee_name ?? `Request #${request.id}`
  const balanceAfter =
    balance === null ? null : balance.days_remaining - request.days_requested

  async function decide(action: 'approve' | 'reject') {
    setError(null)
    setSubmitting(true)
    try {
      await decideRequest(action, request.id)
      onReviewed()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action}`)
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={name}
      label={`Review ${name}'s request`}
      onClose={onClose}
      description={`${request.department_name ?? 'No department'}${
        request.date_requested
          ? ` • Requested ${formatDate(request.date_requested)}`
          : ''
      }`}
      leading={
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sage-background text-xl font-semibold text-sage-foreground"
        >
          {initialsFromName(request.employee_name)}
        </span>
      }
      primary={{
        label: (
          <>
            <Icon name="check" />
            {REVIEW_LABEL.approve}
          </>
        ),
        disabled: submitting,
        onClick: () => decide('approve'),
      }}
      secondary={{
        label: REVIEW_LABEL.reject,
        variant: 'danger',
        disabled: submitting,
        onClick: () => decide('reject'),
      }}
    >
      <dl className="flex flex-col">
        <DetailRow
          label="Dates"
          value={formatDateRange(request.start_date, request.end_date)}
        />
        <DetailRow
          label="Duration"
          value={countLabel(request.days_requested, 'day')}
        />
        <DetailRow label="Leave type" value={request.leave_type} />
        {balance === null ? (
          <DetailRow label="Balance" value="Unavailable" />
        ) : (
          <>
            <DetailRow
              label="Entitlement"
              value={countLabel(balance.annual_allowance, 'day')}
            />
            <DetailRow
              label="Days used"
              value={countLabel(balance.days_used, 'day')}
            />
            <DetailRow
              label="Days remaining"
              value={countLabel(balance.days_remaining, 'day')}
            />
          </>
        )}
        <DetailRow
          label="Balance after"
          value={
            balanceAfter === null
              ? 'Unavailable'
              : countLabel(balanceAfter, 'day')
          }
          emphasis={balanceAfter !== null && balanceAfter < 0}
        />
        <DetailRow
          label="Team overlap"
          value={
            overlap.length === 0
              ? 'Nobody else away'
              : `${overlap.join(', ')} also away`
          }
          emphasis={overlap.length > 0}
        />
      </dl>

      {request.reason && (
        <p className="flex items-start gap-3 rounded-lg bg-sage-background px-4 py-3 text-sage-foreground">
          <Icon name="note" />
          {request.reason}
        </p>
      )}

      {error && <FormAlert message={error} />}
    </Modal>
  )
}
