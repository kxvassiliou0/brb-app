import { getLeaveYear, isWithinLeaveYear } from '@/lib/leaveYear'
import type { LeaveStatus, LeaveRequest, OwnLeaveRequest } from '@/types/api'

export type RequestRow = OwnLeaveRequest &
  Partial<Pick<LeaveRequest, 'employee_id' | 'employee_name' | 'department_id'>>

export type StatusFilter = 'All' | LeaveStatus

export type ScopeFilter = 'all' | 'mine'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const EVERY_LEAVE_STATUS = {
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
} satisfies Record<LeaveStatus, LeaveStatus>

export const STATUS_FILTERS: StatusFilter[] = [
  'All',
  ...Object.values(EVERY_LEAVE_STATUS),
]

export interface RequestFilters {
  status: StatusFilter
  from: string
  to: string
  search: string
  departmentId: number | null
}

export const EMPTY_FILTERS: RequestFilters = {
  status: 'All',
  from: '',
  to: '',
  search: '',
  departmentId: null,
}

export function hasActiveFilters(filters: RequestFilters): boolean {
  return (
    filters.status !== 'All' ||
    filters.from !== '' ||
    filters.to !== '' ||
    filters.search.trim() !== '' ||
    filters.departmentId !== null
  )
}

function matchesRange(row: RequestRow, from: string, to: string): boolean {
  if (from && row.end_date < from) return false
  if (to && row.start_date > to) return false
  return true
}

function matchesSearch(row: RequestRow, search: string): boolean {
  const term = search.trim().toLowerCase()
  if (!term) return true
  return (row.employee_name ?? '').toLowerCase().includes(term)
}

export function filterRequests<T extends RequestRow>(
  rows: T[],
  filters: RequestFilters
): T[] {
  return rows.filter((row) => {
    if (filters.status !== 'All' && row.status !== filters.status) return false
    if (!matchesRange(row, filters.from, filters.to)) return false
    if (!matchesSearch(row, filters.search)) return false
    if (
      filters.departmentId !== null &&
      row.department_id !== filters.departmentId
    ) {
      return false
    }
    return true
  })
}

export function countInLeaveYear(
  rows: RequestRow[],
  reference: Date = new Date()
): number {
  const leaveYear = getLeaveYear(reference)
  return rows.filter((row) => isWithinLeaveYear(row.start_date, leaveYear))
    .length
}

export function countPending(rows: RequestRow[]): number {
  return rows.filter((row) => row.status === 'Pending').length
}

export const DATE_STRIP_DAYS = 30

export function nextDays(
  count: number = DATE_STRIP_DAYS,
  reference: Date = new Date()
): string[] {
  const start = Date.UTC(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate()
  )
  return Array.from({ length: Math.max(0, count) }, (_, index) =>
    new Date(start + index * MS_PER_DAY).toISOString().slice(0, 10)
  )
}

const TONE_PRIORITY: Record<LeaveStatus, number> = {
  Pending: 3,
  Rejected: 2,
  Approved: 1,
  Cancelled: 0,
}

export function overlappingNames(
  rows: LeaveRequest[],
  request: LeaveRequest
): string[] {
  const names = rows
    .filter(
      (row) =>
        row.id !== request.id &&
        row.status !== 'Rejected' &&
        row.status !== 'Cancelled' &&
        row.start_date <= request.end_date &&
        row.end_date >= request.start_date
    )
    .map((row) => row.employee_name)
    .filter((name): name is string => name !== null)
  return [...new Set(names)]
}

export function requestedDates(rows: RequestRow[]): Map<string, LeaveStatus> {
  const dates = new Map<string, LeaveStatus>()
  for (const row of rows) {
    const start = new Date(`${row.start_date}T00:00:00Z`)
    const end = new Date(`${row.end_date}T00:00:00Z`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue
    for (
      let day = start;
      day <= end;
      day = new Date(day.getTime() + MS_PER_DAY)
    ) {
      const key = day.toISOString().slice(0, 10)
      const existing = dates.get(key)
      if (
        existing === undefined ||
        TONE_PRIORITY[row.status] > TONE_PRIORITY[existing]
      ) {
        dates.set(key, row.status)
      }
    }
  }
  return dates
}
