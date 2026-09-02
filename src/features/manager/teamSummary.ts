import { weekOf } from '@/lib/calendar'
import { toIsoDate } from '@/lib/dates'
import type { CalendarEntry, LeaveRequest } from '@/types/api'

export interface TeamSummary {
  pending: number
  urgent: number
  onLeaveToday: number
  teamSize: number
  coveragePercent: number
  approvedThisMonth: number
}

interface TeamMember {
  employee_id: number
  name: string
  department_name: string | null
}

function displayName(id: number, name: string | null): string {
  const trimmed = name?.trim()
  return trimmed ? trimmed : `Employee #${id}`
}

export function directReports(
  pending: LeaveRequest[],
  calendar: CalendarEntry[],
  excludeId?: number
): TeamMember[] {
  const found = new Map<
    number,
    { name: string | null; department: string | null }
  >()

  function add(
    id: number,
    name: string | null,
    department: string | null
  ): void {
    if (!Number.isFinite(id) || id === excludeId) return
    const known = found.get(id)
    if (known === undefined) {
      found.set(id, { name, department })
      return
    }
    if (!known.name?.trim() && name?.trim()) known.name = name
    if (!known.department?.trim() && department?.trim()) {
      known.department = department
    }
  }

  for (const row of pending) {
    add(row.employee_id, row.employee_name, row.department_name)
  }
  for (const entry of calendar) add(entry.employee_id, entry.name, null)

  return [...found]
    .map(([employee_id, { name, department }]) => ({
      employee_id,
      name: displayName(employee_id, name),
      department_name: department?.trim() ? department : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export interface TeamMemberWeek {
  employee_id: number
  name: string
  department_name: string | null
  start_date: string
  end_date: string
}

function spans(entry: CalendarEntry, from: string, to: string): boolean {
  return entry.start_date <= to && entry.end_date >= from
}

export function summariseTeam(
  pending: LeaveRequest[],
  calendar: CalendarEntry[],
  reference: Date = new Date()
): TeamSummary {
  const today = toIsoDate(reference)
  const week = weekOf(today)
  const approved = calendar.filter((entry) => entry.status === 'Approved')
  const teamSize = directReports(pending, calendar).length

  const away = new Set(
    approved
      .filter((entry) => spans(entry, week.from, week.to))
      .map((entry) => entry.employee_id)
  )

  return {
    pending: pending.length,
    urgent: pending.filter((request) => request.start_date <= week.to).length,
    onLeaveToday: new Set(
      approved
        .filter((entry) => spans(entry, today, today))
        .map((entry) => entry.employee_id)
    ).size,
    teamSize,
    coveragePercent:
      teamSize === 0
        ? 100
        : Math.round(((teamSize - away.size) / teamSize) * 100),
    approvedThisMonth: approved.filter((entry) =>
      entry.start_date.startsWith(today.slice(0, 7))
    ).length,
  }
}

export function teamThisWeek(
  calendar: CalendarEntry[],
  departments: { id: number; name: string }[],
  reference: Date = new Date()
): TeamMemberWeek[] {
  const week = weekOf(toIsoDate(reference))
  const names = new Map(departments.map((d) => [d.id, d.name]))

  return calendar
    .filter((entry) => entry.status === 'Approved')
    .filter((entry) => spans(entry, week.from, week.to))
    .map((entry) => ({
      employee_id: entry.employee_id,
      name: entry.name,
      department_name: names.get(entry.department_id) ?? null,
      start_date: entry.start_date,
      end_date: entry.end_date,
    }))
    .sort(
      (a, b) =>
        a.start_date.localeCompare(b.start_date) || a.name.localeCompare(b.name)
    )
}
