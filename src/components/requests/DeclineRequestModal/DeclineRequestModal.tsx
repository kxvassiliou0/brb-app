import { useState } from 'react'
import FormAlert from '@/components/ui/FormAlert'
import { CONTROL_CLASS } from '@/components/ui/InputWithLabel'
import Modal from '@/components/ui/Modal'
import { countLabel, formatDateRange } from '@/lib/dates'
import { decideRequest, REVIEW_LABEL } from '@/features/requests/reviewRequest'
import type { LeaveRequest } from '@/types/api'

interface DeclineRequestModalProps {
  request: LeaveRequest
  noteLabel: string
  onClose: () => void
  onDeclined: () => void
}

export default function DeclineRequestModal({
  request,
  noteLabel,
  onClose,
  onDeclined,
}: DeclineRequestModalProps) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const name = request.employee_name ?? `Request #${request.id}`

  async function confirm(): Promise<void> {
    setError(null)
    setSubmitting(true)
    try {
      await decideRequest('reject', request.id, note)
      onDeclined()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not decline this request'
      )
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Decline this request?"
      label={`Decline ${name}'s request`}
      onClose={onClose}
      description={`${name} asked for ${formatDateRange(request.start_date, request.end_date)} (${countLabel(request.days_requested, 'day')}). They will see the decision and your note.`}
      primary={{
        label: submitting ? 'Declining…' : REVIEW_LABEL.reject,
        variant: 'danger',
        disabled: submitting,
        onClick: confirm,
      }}
      secondary={{ label: 'Keep pending', disabled: submitting }}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor="decline-note" className="text-sm text-text-secondary">
          {noteLabel} (optional)
        </label>
        <textarea
          id="decline-note"
          rows={3}
          value={note}
          placeholder="Two others are already away that week"
          onChange={(event) => setNote(event.target.value)}
          className={CONTROL_CLASS}
        />
      </div>

      {error && <FormAlert message={error} />}
    </Modal>
  )
}
