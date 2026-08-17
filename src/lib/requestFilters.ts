import { getLeaveYear, isWithinLeaveYear } from '@/lib/leaveYear'
import type { LeaveStatus, LeaveRequest, OwnLeaveRequest } from '@/types/api'

export type RequestRow = OwnLeaveRequest &
  Partial<Pick<LeaveRequest, 'employee_id' | 'employee_name' | 'department_id'>>

export type StatusFilter =
  'All' | Extract<LeaveStatus, 'Pending' | 'Approved' | 'Rejected'>

export type ScopeFilter = 'all' | 'mine'

export const STATUS_FILTERS: StatusFilter[] = [
  'All',
  'Pending',
  'Approved',
  'Rejected',
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

export function monthKey(date: string | Date = new Date()): string {
  if (typeof date === 'string') return date.slice(0, 7)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(month: string): string {
  const parsed = new Date(`${month}-01T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return month
  return parsed.toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function monthDays(month: string): string[] {
  const [year, monthNumber] = month.split('-').map(Number)
  if (!year || !monthNumber) return []
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return Array.from(
    { length: dayCount },
    (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`
  )
}

export function requestedDates(rows: RequestRow[]): Set<string> {
  const dates = new Set<string>()
  for (const row of rows) {
    const start = new Date(`${row.start_date}T00:00:00Z`)
    const end = new Date(`${row.end_date}T00:00:00Z`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue
    for (
      let day = start;
      day <= end;
      day = new Date(day.getTime() + 24 * 60 * 60 * 1000)
    ) {
      dates.add(day.toISOString().slice(0, 10))
    }
  }
  return dates
}
