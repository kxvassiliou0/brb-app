import { StatusCodes } from 'http-status-codes'
import { ApiRequestError } from '@/api/client'
import { countDays, countLabel, toIsoDate } from '@/lib/dates'
import type {
  CreateLeaveRequestBody,
  LeaveType,
  UserProfile,
} from '@/types/api'

export const LEAVE_TYPES = ['Vacation', 'Sick', 'Personal'] as const

const BALANCE_ERROR = /exceed[s]? remaining balance/i

const INVALID_DATE_ERROR = /YYYY-MM-DD|invalid date|before the start date/i

const OVERLAP_MESSAGE =
  'Those dates clash with a request you have already made. Choose a range that does not overlap an existing request.'

export const INVALID_DATES_MESSAGE =
  'Those dates were not accepted. Choose a start date, then an end date on or after it, and try again.'

export const BOOKING_CONFIRMATION_FALLBACK =
  'Your leave request has been submitted for review.'

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

export interface EmployeeOption {
  id: number
  name: string
}

export function employeeOptions(users: UserProfile[]): EmployeeOption[] {
  return users
    .map((user) => ({
      id: user.id,
      name:
        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
        `Employee #${user.id}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
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
  if (error.status === StatusCodes.CONFLICT) return OVERLAP_MESSAGE
  if (
    error.status === StatusCodes.BAD_REQUEST &&
    BALANCE_ERROR.test(error.message)
  ) {
    return daysRemaining === null
      ? `This request is longer than your remaining balance. ${error.message}.`
      : `This request needs ${countLabel(requestedDays(draft), 'day')} but you have only ${countLabel(daysRemaining, 'day')} remaining.`
  }
  if (
    error.status === StatusCodes.BAD_REQUEST &&
    INVALID_DATE_ERROR.test(error.message)
  ) {
    return INVALID_DATES_MESSAGE
  }
  return error.message
}
