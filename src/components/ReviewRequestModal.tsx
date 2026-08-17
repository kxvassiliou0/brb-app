import { useState } from 'react'
import Button from '@/components/Button'
import Icon from '@/components/Icon'
import Modal from '@/components/Modal'
import { initialsFromName } from '@/components/UserSummary'
import { countLabel, formatDate, formatDateRange } from '@/lib/dates'
import { overlappingNames } from '@/lib/requestFilters'
import { decideRequest, REVIEW_LABEL } from '@/lib/reviewRequest'
import type { LeaveRequest } from '@/types/api'

interface ReviewRequestModalProps {
  request: LeaveRequest
  team: LeaveRequest[]
  balanceAfter: number | null
  onClose: () => void
  onReviewed: () => void
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-border-primary py-4">
      <dt className="text-text-secondary">{label}</dt>
      <dd
        className={`text-right font-medium ${
          emphasis ? 'text-pending-foreground' : 'text-text-primary'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

export default function ReviewRequestModal({
  request,
  team,
  balanceAfter,
  onClose,
  onReviewed,
}: ReviewRequestModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const overlap = overlappingNames(team, request)
  const name = request.employee_name ?? `Request #${request.id}`

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
    <Modal label={`Review ${name}'s request`} onClose={onClose}>
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sage-background text-xl font-semibold text-sage-foreground"
        >
          {initialsFromName(request.employee_name)}
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate text-2xl md:text-3xl">{name}</h2>
          <p className="text-text-secondary">
            {request.department_name ?? 'No department'}
            {request.date_requested &&
              ` • Requested ${formatDate(request.date_requested)}`}
          </p>
        </div>
      </div>

      <dl className="flex flex-col">
        <Row
          label="Dates"
          value={formatDateRange(request.start_date, request.end_date)}
          emphasis={false}
        />
        <Row
          label="Duration"
          value={countLabel(request.days_requested, 'day')}
          emphasis={false}
        />
        <Row label="Leave type" value={request.leave_type} emphasis={false} />
        <Row
          label="Balance after"
          value={
            balanceAfter === null
              ? 'Unavailable'
              : countLabel(balanceAfter, 'day')
          }
          emphasis={false}
        />
        <Row
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

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-error-background px-4 py-3 text-sm text-error-foreground"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
        <Button
          variant="primary"
          disabled={submitting}
          onClick={() => decide('approve')}
        >
          <Icon name="check" />
          {REVIEW_LABEL.approve}
        </Button>
        <Button
          variant="danger"
          disabled={submitting}
          onClick={() => decide('reject')}
        >
          {REVIEW_LABEL.reject}
        </Button>
      </div>
    </Modal>
  )
}
