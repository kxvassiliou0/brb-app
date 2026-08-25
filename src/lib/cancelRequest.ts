import { ApiRequestError, apiFetch, getApiErrorMessage } from '@/lib/api'
import { clearApiCache } from '@/lib/apiCache'
import { HTTP_BAD_REQUEST } from '@/lib/booking'
import type {
  ApiSuccess,
  DeleteLeaveRequestBody,
  DeleteLeaveRequestResult,
  LeaveStatus,
} from '@/types/api'

export const CANCEL_LABEL = 'Cancel request'

export const CONFIRM_CANCEL_LABEL = 'Confirm cancel'

export const KEEP_REQUEST_LABEL = 'Keep request'

export const ALREADY_CANCELLED_MESSAGE =
  'This request has already been cancelled. Refresh the page to see its current status.'

export const CANCEL_FAILED_MESSAGE =
  'Your request could not be cancelled. Please try again.'

const ALREADY_CANCELLED = /already cancelled/i

export function isCancellable(status: LeaveStatus): boolean {
  return status === 'Pending'
}

export async function cancelRequest(
  requestId: number
): Promise<DeleteLeaveRequestResult> {
  const payload: DeleteLeaveRequestBody = { leave_request_id: requestId }
  const res = await apiFetch<ApiSuccess<DeleteLeaveRequestResult>>(
    '/api/leave-requests',
    { method: 'DELETE', body: JSON.stringify(payload) }
  )
  clearApiCache()
  return res.data
}

export function cancelErrorMessage(error: unknown): string {
  if (
    error instanceof ApiRequestError &&
    error.status === HTTP_BAD_REQUEST &&
    ALREADY_CANCELLED.test(error.message)
  ) {
    return ALREADY_CANCELLED_MESSAGE
  }
  return getApiErrorMessage(error, CANCEL_FAILED_MESSAGE)
}
