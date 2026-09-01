import { reviewLeaveRequest } from '@/api/leaveRequests'
import type { ReviewLeaveRequestBody } from '@/types/api'

export type ReviewAction = 'approve' | 'reject'

export const REVIEW_LABEL: Record<ReviewAction, string> = {
  approve: 'Approve',
  reject: 'Decline',
}

export async function decideRequest(
  action: ReviewAction,
  requestId: number,
  reason?: string
): Promise<void> {
  const note = reason?.trim()
  const payload: ReviewLeaveRequestBody = {
    leave_request_id: requestId,
    ...(note ? { reason: note } : {}),
  }
  await reviewLeaveRequest(action, payload)
}
