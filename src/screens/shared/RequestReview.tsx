import type { LeaveRequest, ReviewLeaveRequestBody } from '@/types/api'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import Button from '@/components/Button'
import PageHeader from '../../components/PageHeader'
import StatusPill from '@/components/StatusPill'
import { apiFetch } from '../../lib/api'

export default function RequestReview() {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const row = (location.state as { request?: LeaveRequest } | null)?.request
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function decide(action: 'approve' | 'reject') {
    setError(null)
    setSubmitting(true)
    try {
      const payload: ReviewLeaveRequestBody = {
        leave_request_id: Number(requestId),
      }
      await apiFetch(`/api/leave-requests/${action}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      navigate(-1)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${action} request`
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div data-testid="screen-request-review">
      <PageHeader
        title={`Review request #${requestId}`}
        description="Approve or decline this time-off request."
      />
      <div className="flex max-w-2xl flex-col gap-6 rounded-xl border border-border-primary bg-background-secondary p-4 sm:p-6">
        {row ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-sm text-text-secondary">Employee ID</dt>
              <dd className="mt-1">{row.employee_id}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-sm text-text-secondary">Type</dt>
              <dd className="mt-1">{row.leave_type}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-sm text-text-secondary">Dates</dt>
              <dd className="mt-1">
                {row.start_date} – {row.end_date}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-sm text-text-secondary">Status</dt>
              <dd className="mt-1">
                <StatusPill status={row.status} />
              </dd>
            </div>
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-sm text-text-secondary">Reason</dt>
              <dd className="mt-1">{row.reason ?? '-'}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-text-secondary">
            No details were passed in - open this screen from the requests list
            to see them.
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
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button onClick={() => decide('approve')} disabled={submitting}>
            Approve
          </Button>
          <Button
            variant="secondary"
            onClick={() => decide('reject')}
            disabled={submitting}
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  )
}
