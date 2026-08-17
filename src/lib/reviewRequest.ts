import { apiFetch } from '@/lib/api'
import { clearApiCache } from '@/lib/apiCache'
import type { ReviewLeaveRequestBody } from '@/types/api'

export type ReviewAction = 'approve' | 'reject'

export const REVIEW_LABEL: Record<ReviewAction, string> = {
  approve: 'Approve',
  reject: 'Decline',
}

export async function decideRequest(
  action: ReviewAction,
  requestId: number
): Promise<void> {
  const payload: ReviewLeaveRequestBody = { leave_request_id: requestId }
  await apiFetch(`/api/leave-requests/${action}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  clearApiCache()
}
