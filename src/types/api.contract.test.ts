import { describe, expect, it } from 'vitest'
import type {
  CalendarEntry,
  CreateLeaveRequestBody,
  CreateLeaveRequestResult,
  DeleteLeaveRequestBody,
  DeleteLeaveRequestResult,
  ExcludedPublicHoliday,
  LeaveRequest,
  LeaveUsageEmployee,
  LeaveUsageReport,
  OwnLeaveRequest,
  RemainingLeave,
  ReviewLeaveRequestBody,
} from './api'

type IsUpperCaseLetter<S extends string> =
  S extends Uppercase<S> ? (S extends Lowercase<S> ? false : true) : false

type ContainsUpperCase<S extends string> =
  S extends `${infer Head}${infer Tail}`
    ? IsUpperCaseLetter<Head> extends true
      ? true
      : ContainsUpperCase<Tail>
    : false

type NonSnakeCaseKeys<T> = {
  [K in keyof T & string]: ContainsUpperCase<K> extends true ? K : never
}[keyof T & string]

type AssertSnakeCase<T> = [NonSnakeCaseKeys<T>] extends [never]
  ? true
  : NonSnakeCaseKeys<T>

export const leaveRequestIsSnakeCase: AssertSnakeCase<LeaveRequest> = true
export const ownLeaveRequestIsSnakeCase: AssertSnakeCase<OwnLeaveRequest> = true
export const remainingLeaveIsSnakeCase: AssertSnakeCase<RemainingLeave> = true
export const calendarEntryIsSnakeCase: AssertSnakeCase<CalendarEntry> = true
export const leaveUsageEmployeeIsSnakeCase: AssertSnakeCase<LeaveUsageEmployee> = true
export const leaveUsageReportIsSnakeCase: AssertSnakeCase<LeaveUsageReport> = true
export const createBodyIsSnakeCase: AssertSnakeCase<CreateLeaveRequestBody> = true
export const createResultIsSnakeCase: AssertSnakeCase<CreateLeaveRequestResult> = true
export const excludedHolidayIsSnakeCase: AssertSnakeCase<ExcludedPublicHoliday> = true
export const deleteBodyIsSnakeCase: AssertSnakeCase<DeleteLeaveRequestBody> = true
export const reviewBodyIsSnakeCase: AssertSnakeCase<ReviewLeaveRequestBody> = true
export const deleteResultIsSnakeCase: AssertSnakeCase<DeleteLeaveRequestResult> = true

type Probe = {
  [
    K in
      | 'employee_id'
      | 'employeeId'
      | 'start_date'
      | 'startDate'
      | 'days_remaining'
      | 'daysRemaining'
  ]: ContainsUpperCase<K>
}

const probe: Probe = {
  employee_id: false,
  employeeId: true,
  start_date: false,
  startDate: true,
  days_remaining: false,
  daysRemaining: true,
}

describe('API contract field naming', () => {
  it('detects camelCase keys so drift cannot compile', () => {
    expect(probe).toEqual({
      employee_id: false,
      employeeId: true,
      start_date: false,
      startDate: true,
      days_remaining: false,
      daysRemaining: true,
    })
  })

  it('accepts the snake_case contract types', () => {
    expect(leaveRequestIsSnakeCase).toBe(true)
    expect(remainingLeaveIsSnakeCase).toBe(true)
    expect(calendarEntryIsSnakeCase).toBe(true)
    expect(createResultIsSnakeCase).toBe(true)
    expect(excludedHolidayIsSnakeCase).toBe(true)
  })
})
