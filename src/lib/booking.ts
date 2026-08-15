import { ApiRequestError } from '@/lib/api'
import { countDays, countLabel } from '@/lib/dates'
import type { CreateLeaveRequestBody, LeaveType } from '@/types/api'

export const LEAVE_TYPES = ['Vacation', 'Sick', 'Personal'] as const

export const HTTP_BAD_REQUEST = 400

export const HTTP_CONFLICT = 409

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const BALANCE_ERROR = /exceed[s]? remaining balance/i

export const OVERLAP_MESSAGE =
  'Those dates clash with a request you have already made. Choose a range that does not overlap an existing request.'

export interface BookingDraft {
  leaveType: LeaveType | ''
  startDate: string
  endDate: string
  reason: string
}

export interface BookingErrors {
  leaveType?: string
  startDate?: string
  endDate?: string
}

export const EMPTY_DRAFT: BookingDraft = {
  leaveType: '',
  startDate: '',
  endDate: '',
  reason: '',
}

export function toIsoDate(value: Date | string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (ISO_DATE.test(trimmed)) return trimmed
    if (ISO_DATE.test(trimmed.slice(0, 10))) return trimmed.slice(0, 10)
    return toIsoDate(new Date(trimmed))
  }
  if (Number.isNaN(value.getTime())) return ''
  const year = String(value.getFullYear()).padStart(4, '0')
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function validateBooking(draft: BookingDraft): BookingErrors {
  const errors: BookingErrors = {}
  if (!draft.leaveType) errors.leaveType = 'Please select a leave type'
  if (!draft.startDate) errors.startDate = 'Please choose a start date'
  if (!draft.endDate) errors.endDate = 'Please choose an end date'
  if (
    draft.startDate &&
    draft.endDate &&
    draft.endDate < draft.startDate &&
    !errors.endDate
  ) {
    errors.endDate = 'End date must be on or after the start date'
  }
  return errors
}

export function hasBookingErrors(errors: BookingErrors): boolean {
  return Object.keys(errors).length > 0
}

export function requestedDays(draft: BookingDraft): number {
  if (!draft.startDate || !draft.endDate) return 0
  if (draft.endDate < draft.startDate) return 0
  return countDays(draft.startDate, draft.endDate)
}

export function remainingAfterRequest(
  daysRemaining: number,
  draft: BookingDraft
): number {
  return daysRemaining - requestedDays(draft)
}

export function buildCreateBody(
  draft: BookingDraft,
  employeeId?: number
): CreateLeaveRequestBody {
  const reason = draft.reason.trim()
  return {
    ...(employeeId === undefined ? {} : { employee_id: employeeId }),
    start_date: toIsoDate(draft.startDate),
    end_date: toIsoDate(draft.endDate),
    leave_type: draft.leaveType as LeaveType,
    ...(reason ? { reason } : {}),
  }
}

export function bookingErrorMessage(
  error: unknown,
  draft: BookingDraft,
  daysRemaining: number | null
): string {
  if (!(error instanceof ApiRequestError)) {
    return error instanceof Error && error.message.trim()
      ? error.message
      : 'Your request could not be sent. Please try again.'
  }
  if (error.status === HTTP_CONFLICT) return OVERLAP_MESSAGE
  if (
    error.status === HTTP_BAD_REQUEST &&
    BALANCE_ERROR.test(error.message) &&
    daysRemaining !== null
  ) {
    return `This request needs ${countLabel(requestedDays(draft), 'day')} but you have only ${countLabel(daysRemaining, 'day')} remaining.`
  }
  return error.message
}
