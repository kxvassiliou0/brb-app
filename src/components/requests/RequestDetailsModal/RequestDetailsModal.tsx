import DetailRow from '@/components/ui/DetailRow'
import Icon from '@/components/ui/Icon'
import Modal from '@/components/ui/Modal'
import StatusPill from '@/components/ui/StatusPill'
import { countLabel, formatDate, formatDateRange } from '@/lib/dates'
import type { RequestRow } from '@/features/requests/requestFilters'

interface RequestDetailsModalProps {
  request: RequestRow
  onClose: () => void
}

export default function RequestDetailsModal({
  request,
  onClose,
}: RequestDetailsModalProps) {
  const requested = request.date_requested
    ? `Requested ${formatDate(request.date_requested)}`
    : 'Request date unavailable'

  return (
    <Modal
      title={`${request.leave_type} leave`}
      label={`${request.leave_type} request`}
      onClose={onClose}
      description={requested}
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
        <DetailRow
          label="Date requested"
          value={
            request.date_requested ? formatDate(request.date_requested) : '—'
          }
        />
        <DetailRow
          label="Status"
          value={<StatusPill status={request.status} />}
        />
      </dl>

      {request.reason && (
        <p className="flex items-start gap-3 rounded-lg bg-sage-background px-4 py-3 text-sage-foreground">
          <Icon name="note" />
          {request.reason}
        </p>
      )}

      {request.status === 'Rejected' && request.manager_note && (
        <div
          data-testid="manager-note"
          className="flex items-start gap-3 rounded-lg bg-error-background px-4 py-3 text-error-foreground"
        >
          <Icon name="note" />
          <p className="flex flex-col gap-1">
            <span className="font-medium">Manager&rsquo;s note</span>
            {request.manager_note}
          </p>
        </div>
      )}
    </Modal>
  )
}
