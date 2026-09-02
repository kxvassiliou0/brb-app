import {
  createPublicHoliday,
  deletePublicHoliday,
  updatePublicHoliday,
  type PublicHoliday,
} from '@/api/publicHolidays'
import { countLabel, formatDate, formatDateRange, toIsoDate } from '@/lib/dates'
import type { LeaveRequest } from '@/types/api'

export type { PublicHoliday }

export function holidaysByDate(holidays: PublicHoliday[]): Map<string, string> {
  return new Map(
    holidays.map((holiday) => [toIsoDate(holiday.date), holiday.name])
  )
}

export interface HolidayErrors {
  name?: string
  date?: string
}

export function validateHoliday(
  name: string,
  date: string,
  holidays: PublicHoliday[],
  holidayId?: number
): HolidayErrors {
  const errors: HolidayErrors = {}

  const trimmed = name.trim()
  if (!trimmed) errors.name = 'Please enter a holiday name'
  else if (trimmed.length > 100) {
    errors.name = 'Name must be 100 characters or less'
  }

  if (!date) errors.date = 'Please choose a date'
  else {
    const taken = holidays.find(
      (holiday) => holiday.id !== holidayId && toIsoDate(holiday.date) === date
    )
    if (taken) {
      errors.date = `${formatDate(date)} is already held as ${taken.name}`
    }
  }

  return errors
}

export function saveHoliday(
  name: string,
  date: string,
  holiday?: PublicHoliday
): Promise<PublicHoliday> {
  const body = { name: name.trim(), date }
  return holiday === undefined
    ? createPublicHoliday(body)
    : updatePublicHoliday(holiday.id, body)
}

export function removeHoliday(holiday: PublicHoliday): Promise<void> {
  return deletePublicHoliday(holiday.id)
}

export function approvedClashWarning(
  date: string,
  requests: LeaveRequest[]
): string | null {
  if (!date) return null
  const affected = requests.filter(
    (request) =>
      request.status === 'Approved' &&
      toIsoDate(request.start_date) <= date &&
      toIsoDate(request.end_date) >= date
  )
  if (affected.length === 0) return null
  const named = affected
    .map(
      (request) =>
        `${request.employee_name ?? 'An employee'} (${formatDateRange(toIsoDate(request.start_date), toIsoDate(request.end_date))})`
    )
    .join(', ')
  return `${formatDate(date)} falls inside ${countLabel(affected.length, 'approved request')}: ${named}. Those requests were priced without this holiday, so their day counts stay as they are.`
}
