import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { apiFetch } from '../../lib/api'
import type { CreateLeaveRequestBody, LeaveType } from '@/types/api'
import Button from '@/components/Button'
import InputWithLabel, {
  CONTROL_CLASS,
  Field,
} from '@/components/InputWithLabel'
import PageHeader from '../../components/PageHeader'

export default function CreateRequest() {
  const navigate = useNavigate()
  const [leaveType, setLeaveType] = useState<LeaveType>('Vacation')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload: CreateLeaveRequestBody = {
        start_date: startDate,
        end_date: endDate,
        leave_type: leaveType,
        reason: reason || undefined,
      }
      await apiFetch('/api/leave-requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      navigate(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div data-testid="screen-create-request">
      <PageHeader
        title="Create a request"
        description="Submit a new time-off request for approval."
      />
      <form
        onSubmit={handleSubmit}
        className="flex max-w-2xl flex-col gap-5 rounded-xl border border-border-primary bg-background-secondary p-4 sm:p-6"
      >
        <Field id="leave-type" label="Type">
          <select
            id="leave-type"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as LeaveType)}
            className={CONTROL_CLASS}
          >
            <option value="Vacation">Vacation</option>
            <option value="Sick">Sick</option>
            <option value="Personal">Personal</option>
          </select>
        </Field>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <InputWithLabel
            id="start-date"
            label="Start date"
            type="date"
            value={startDate}
            onChange={setStartDate}
            required
          />
          <InputWithLabel
            id="end-date"
            label="End date"
            type="date"
            value={endDate}
            onChange={setEndDate}
            required
          />
        </div>
        <Field id="reason" label="Reason">
          <textarea
            id="reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={CONTROL_CLASS}
          />
        </Field>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-error-background px-4 py-3 text-sm text-error-foreground"
          >
            {error}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
