import { StatusCodes } from 'http-status-codes'
import { ApiRequestError, getApiErrorMessage } from '@/api/client'
import { cancelLeaveRequest } from '@/api/leaveRequests'
import type {
  DeleteLeaveRequestBody,
  DeleteLeaveRequestResult,
  LeaveStatus,
} from '@/types/api'

export const CANCEL_LABEL = 'Cancel request'

export const CONFIRM_CANCEL_LABEL = 'Confirm cancel'

export const KEEP_REQUEST_LABEL = 'Keep request'

export const ALREADY_CANCELLED_MESSAGE =
  'This request has already been cancelled. Refresh the page to see its current status.'

const CANCEL_FAILED_MESSAGE =
  'Your request could not be cancelled. Please try again.'

const ALREADY_CANCELLED = /already cancelled/i

export function isCancellable(status: LeaveStatus): boolean {
  return status === 'Pending'
}

export function cancelRequest(
  requestId: number
): Promise<DeleteLeaveRequestResult> {
  const payload: DeleteLeaveRequestBody = { leave_request_id: requestId }
  return cancelLeaveRequest(payload)
}

export function cancelErrorMessage(error: unknown): string {
  if (
    error instanceof ApiRequestError &&
    error.status === StatusCodes.BAD_REQUEST &&
    ALREADY_CANCELLED.test(error.message)
  ) {
    return ALREADY_CANCELLED_MESSAGE
  }
  return getApiErrorMessage(error, CANCEL_FAILED_MESSAGE)
}
