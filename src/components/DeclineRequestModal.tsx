import { useState } from 'react'
import Button from '@/components/Button'
import { CONTROL_CLASS } from '@/components/InputWithLabel'
import Modal from '@/components/Modal'
import { countLabel, formatDateRange } from '@/lib/dates'
import { decideRequest, REVIEW_LABEL } from '@/lib/reviewRequest'
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
    <Modal label={`Decline ${name}'s request`} onClose={onClose}>
      <div data-testid="decline-confirmation" className="flex flex-col gap-1">
        <h2 className="text-2xl md:text-3xl">Decline this request?</h2>
        <p className="text-sm text-text-secondary">
          {name} asked for{' '}
          {formatDateRange(request.start_date, request.end_date)} (
          {countLabel(request.days_requested, 'day')}). They will see the
          decision and your note.
        </p>
      </div>

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

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-error-background px-4 py-3 text-sm text-error-foreground"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
        <Button variant="danger" disabled={submitting} onClick={confirm}>
          {submitting ? 'Declining…' : REVIEW_LABEL.reject}
        </Button>
        <Button variant="secondary" disabled={submitting} onClick={onClose}>
          Keep pending
        </Button>
      </div>
    </Modal>
  )
}
