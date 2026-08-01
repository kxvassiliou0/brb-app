import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { apiFetch } from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import type { LeaveRow } from './RequestsList'

export default function RequestReview() {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const row = (location.state as { request?: LeaveRow } | null)?.request
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function decide(action: 'approve' | 'reject') {
    setError(null)
    setSubmitting(true)
    try {
      await apiFetch(`/api/leave-requests/${action}`, {
        method: 'PATCH',
        body: JSON.stringify({ leave_request_id: Number(requestId) }),
      })
      navigate(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} request`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div data-testid="screen-request-review">
      <PageHeader title={`Review request #${requestId}`} description="Approve or decline this time-off request." />
      {row ? (
        <dl>
          <div>
            <dt>Employee ID</dt>
            <dd>{row.employee_id}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{row.leave_type}</dd>
          </div>
          <div>
            <dt>Dates</dt>
            <dd>
              {row.start_date} – {row.end_date}
            </dd>
          </div>
          <div>
            <dt>Reason</dt>
            <dd>{row.reason ?? '—'}</dd>
          </div>
        </dl>
      ) : (
        <p>No details were passed in — open this screen from the requests list to see them.</p>
      )}
      <button onClick={() => decide('reject')} disabled={submitting}>
        Decline
      </button>
      <button onClick={() => decide('approve')} disabled={submitting}>
        Approve
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
