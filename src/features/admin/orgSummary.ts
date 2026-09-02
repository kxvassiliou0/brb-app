import { toIsoDate } from '@/lib/dates'
import { getLeaveYear, isWithinLeaveYear } from '@/lib/leaveYear'
import type { LeaveRequest, LeaveUsageReport, UserListItem } from '@/types/api'

interface DepartmentLeave {
  name: string
  days: number
}

export interface OrgSummary {
  employees: number
  departments: number
  requestsThisMonth: number
  pendingThisMonth: number
  onLeaveToday: number
  staffOnLeavePercent: number
  averageDaysPerEmployee: number
  byDepartment: DepartmentLeave[]
}

export function summariseOrganisation(
  users: UserListItem[],
  requests: LeaveRequest[],
  usage: LeaveUsageReport,
  reference: Date = new Date()
): OrgSummary {
  const leaveYear = getLeaveYear(reference)
  const today = toIsoDate(reference)
  const month = today.slice(0, 7)

  const thisMonth = requests.filter(
    (request) =>
      request.date_requested !== null &&
      request.date_requested.startsWith(month) &&
      isWithinLeaveYear(request.date_requested, leaveYear)
  )

  const onLeave = new Set(
    requests
      .filter(
        (request) =>
          request.status === 'Approved' &&
          request.start_date <= today &&
          request.end_date >= today
      )
      .map((request) => request.employee_id)
  )

  const days = new Map(users.map((user) => [user.department.name, 0]))
  const departmentOf = new Map(
    users.map((user) => [user.id, user.department.name])
  )
  for (const entry of usage.employees) {
    const name = departmentOf.get(entry.employee_id)
    if (name === undefined) continue
    days.set(name, (days.get(name) ?? 0) + entry.total_days_used)
  }

  const byDepartment = [...days]
    .map(([name, taken]) => ({ name, days: taken }))
    .sort((a, b) => b.days - a.days || a.name.localeCompare(b.name))
  const totalDays = byDepartment.reduce((total, row) => total + row.days, 0)

  return {
    employees: users.length,
    departments: days.size,
    requestsThisMonth: thisMonth.length,
    pendingThisMonth: thisMonth.filter(
      (request) => request.status === 'Pending'
    ).length,
    onLeaveToday: onLeave.size,
    staffOnLeavePercent:
      users.length === 0 ? 0 : Math.round((onLeave.size / users.length) * 100),
    averageDaysPerEmployee:
      users.length === 0 ? 0 : Math.round(totalDays / users.length),
    byDepartment,
  }
}
