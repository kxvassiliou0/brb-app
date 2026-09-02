import { get, patch, postWithMessage, remove } from '@/api/client'
import type {
  CalendarEntry,
  CreateLeaveRequestBody,
  DeleteLeaveRequestBody,
  DeleteLeaveRequestResult,
  LeaveRequest,
  LeaveUsageReport,
  OwnLeaveRequest,
  RemainingLeave,
  ReviewLeaveRequestBody,
} from '@/types/api'

const LEAVE_REQUESTS_PATH = '/api/leave-requests'

export function remainingLeavePath(employeeId: number): string {
  return `${LEAVE_REQUESTS_PATH}/remaining/${employeeId}`
}

export function listAllRequests(): Promise<LeaveRequest[]> {
  return get<LeaveRequest[]>(LEAVE_REQUESTS_PATH)
}

export function listRequestsFor(
  employeeId: number
): Promise<OwnLeaveRequest[]> {
  return get<OwnLeaveRequest[]>(`${LEAVE_REQUESTS_PATH}/status/${employeeId}`)
}

export function listPendingForManager(
  managerId: number
): Promise<LeaveRequest[]> {
  return get<LeaveRequest[]>(
    `${LEAVE_REQUESTS_PATH}/pending/manager/${managerId}`
  )
}

export function listCalendar(
  from: string,
  to: string
): Promise<CalendarEntry[]> {
  return get<CalendarEntry[]>(
    `${LEAVE_REQUESTS_PATH}/calendar?from=${from}&to=${to}`
  )
}

export function getLeaveUsageReport(
  from: string,
  to: string
): Promise<LeaveUsageReport> {
  return get<LeaveUsageReport>(
    `${LEAVE_REQUESTS_PATH}/reports/usage?from=${from}&to=${to}`
  )
}

export function getRemainingLeave(employeeId: number): Promise<RemainingLeave> {
  return get<RemainingLeave>(remainingLeavePath(employeeId))
}

interface CreatedLeaveRequest {
  request: LeaveRequest
  message?: string
}

export async function createLeaveRequest(
  body: CreateLeaveRequestBody
): Promise<CreatedLeaveRequest> {
  const { data, message } = await postWithMessage<LeaveRequest>(
    LEAVE_REQUESTS_PATH,
    body
  )
  return { request: data, message }
}

export function cancelLeaveRequest(
  body: DeleteLeaveRequestBody
): Promise<DeleteLeaveRequestResult> {
  return remove<DeleteLeaveRequestResult>(LEAVE_REQUESTS_PATH, body)
}

export function reviewLeaveRequest(
  action: 'approve' | 'reject',
  body: ReviewLeaveRequestBody
): Promise<void> {
  return patch(`${LEAVE_REQUESTS_PATH}/${action}`, body)
}
