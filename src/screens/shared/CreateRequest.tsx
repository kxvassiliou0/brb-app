import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { apiFetch } from '../../lib/api'
import PageHeader from '../../components/PageHeader'

export default function CreateRequest() {
  const navigate = useNavigate()
  const [leaveType, setLeaveType] = useState('Vacation')
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
      await apiFetch('/api/leave-requests', {
        method: 'POST',
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          leave_type: leaveType,
          reason: reason || undefined,
        }),
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
      <PageHeader title="Create a request" description="Submit a new time-off request for approval." />
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="leave-type">Type</label>
          <br />
          <select id="leave-type" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
            <option value="Vacation">Vacation</option>
            <option value="Sick">Sick</option>
            <option value="Personal">Personal</option>
          </select>
        </div>
        <div>
          <label htmlFor="start-date">Start date</label>
          <br />
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="end-date">End date</label>
          <br />
          <input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="reason">Reason</label>
          <br />
          <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
        <button type="button" onClick={() => navigate(-1)}>
          Cancel
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
