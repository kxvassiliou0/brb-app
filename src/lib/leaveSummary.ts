import { countDays } from '@/lib/dates'
import { getLeaveYear, isWithinLeaveYear } from '@/lib/leaveYear'
import type { OwnLeaveRequest } from '@/types/api'

export const RECENT_REQUEST_LIMIT = 5

export interface LeaveSummary {
  bookedRequests: number
  pendingRequests: number
  sickDays: number
}

export function summariseRequests(
  requests: OwnLeaveRequest[],
  reference: Date = new Date()
): LeaveSummary {
  const leaveYear = getLeaveYear(reference)
  const thisLeaveYear = requests.filter((request) =>
    isWithinLeaveYear(request.start_date, leaveYear)
  )

  return {
    bookedRequests: thisLeaveYear.filter(
      (request) => request.status === 'Approved'
    ).length,
    pendingRequests: requests.filter((request) => request.status === 'Pending')
      .length,
    sickDays: thisLeaveYear
      .filter(
        (request) =>
          request.leave_type === 'Sick' && request.status === 'Approved'
      )
      .reduce(
        (total, request) =>
          total + countDays(request.start_date, request.end_date),
        0
      ),
  }
}

export function recentRequests(
  requests: OwnLeaveRequest[],
  limit: number = RECENT_REQUEST_LIMIT
): OwnLeaveRequest[] {
  return [...requests]
    .sort((a, b) => b.start_date.localeCompare(a.start_date) || b.id - a.id)
    .slice(0, limit)
}
