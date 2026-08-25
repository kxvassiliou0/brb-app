import { cachedGet } from '@/lib/apiCache'
import type {
  ApiSuccess,
  CalendarEntry,
  LeaveRequest,
  RemainingLeave,
} from '@/types/api'

export interface TeamMember {
  employee_id: number
  name: string
  department_name: string | null
}

export interface TeamBalance extends TeamMember {
  balance: RemainingLeave | null
}

export const REPORTS_COVERAGE_NOTE =
  'Anyone who has never requested or taken leave will not appear here yet.'

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

export function remainingLeavePath(employeeId: number): string {
  return `/api/leave-requests/remaining/${employeeId}`
}

export async function fetchTeamBalances(
  members: TeamMember[],
  force = false
): Promise<TeamBalance[]> {
  const settled = await Promise.allSettled(
    members.map((member) =>
      cachedGet<ApiSuccess<RemainingLeave>>(
        remainingLeavePath(member.employee_id),
        force
      )
    )
  )

  return members.map((member, index) => {
    const result = settled[index]
    return {
      ...member,
      balance: result?.status === 'fulfilled' ? result.value.data : null,
    }
  })
}
