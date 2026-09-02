import { describe, expect, it } from 'vitest'
import { summariseOrganisation } from '@/features/admin/orgSummary'
import { countDays } from '@/lib/dates'
import type {
  LeaveRequest,
  LeaveStatus,
  LeaveUsageReport,
  UserListItem,
} from '@/types/api'

const REFERENCE = new Date(2026, 6, 15)

const ENGINEERING = { id: 1, name: 'Engineering' }
const FINANCE = { id: 2, name: 'Finance' }

function user(
  id: number,
  department: { id: number; name: string } = ENGINEERING
): UserListItem {
  return {
    id,
    firstName: `Person${id}`,
    lastName: 'Example',
    email: `person${id}@company.com`,
    role: 'Employee',
    annualLeaveAllowance: 25,
    department,
    jobRole: { id: 1, name: 'Engineer' },
    manager: null,
  }
}

function request(
  id: number,
  start_date: string,
  end_date: string,
  status: LeaveStatus = 'Approved',
  employee_id = 1,
  date_requested: string | null = start_date
): LeaveRequest {
  return {
    id,
    employee_id,
    employee_name: `Person${employee_id}`,
    department_id: 1,
    department_name: 'Engineering',
    leave_type: 'Vacation',
    start_date,
    end_date,
    days_requested: countDays(start_date, end_date),
    date_requested,
    status,
    reason: null,
    manager_note: null,
    reviewed_by_name: null,
  }
}

function usage(
  entries: [employee_id: number, total_days_used: number][]
): LeaveUsageReport {
  return {
    scope: 'company-wide',
    employees: entries.map(([employee_id, total_days_used]) => ({
      employee_id,
      name: `Person${employee_id}`,
      department_id: 1,
      breakdown: { Vacation: total_days_used, Sick: 0, Personal: 0 },
      total_days_used,
    })),
  }
}

const NO_USAGE: LeaveUsageReport = { scope: 'company-wide', employees: [] }

describe('summariseOrganisation', () => {
  it('takes every headline figure from the endpoint that owns it', () => {
    const users = [user(1), user(2), user(3, FINANCE)]
    const requests = [
      request(1, '2026-07-20', '2026-07-24', 'Approved', 1, '2026-07-01'),
      request(2, '2026-08-03', '2026-08-04', 'Pending', 2, '2026-07-09'),
      request(3, '2026-06-01', '2026-06-02', 'Approved', 3, '2026-06-01'),
    ]
    const summary = summariseOrganisation(
      users,
      requests,
      usage([
        [1, 10],
        [2, 4],
        [3, 4],
      ]),
      REFERENCE
    )

    expect(summary.employees).toBe(3)
    expect(summary.departments).toBe(2)
    expect(summary.requestsThisMonth).toBe(2)
    expect(summary.pendingThisMonth).toBe(1)
    expect(summary.averageDaysPerEmployee).toBe(6)
  })

  it('counts only Approved requests spanning today as on leave', () => {
    const summary = summariseOrganisation(
      [user(1), user(2), user(3), user(4)],
      [
        request(1, '2026-07-13', '2026-07-17', 'Approved', 1),
        request(2, '2026-07-15', '2026-07-15', 'Approved', 2),
        request(3, '2026-07-13', '2026-07-17', 'Pending', 3),
        request(4, '2026-07-16', '2026-07-20', 'Approved', 4),
        request(5, '2026-07-01', '2026-07-14', 'Approved', 4),
      ],
      NO_USAGE,
      REFERENCE
    )

    expect(summary.onLeaveToday).toBe(2)
    expect(summary.staffOnLeavePercent).toBe(50)
  })

  it('counts an employee once when two approved requests both span today', () => {
    const summary = summariseOrganisation(
      [user(1)],
      [
        request(1, '2026-07-13', '2026-07-17', 'Approved', 1),
        request(2, '2026-07-15', '2026-07-18', 'Approved', 1),
      ],
      NO_USAGE,
      REFERENCE
    )

    expect(summary.onLeaveToday).toBe(1)
  })

  it('splits the company-wide total across departments without losing days', () => {
    const report = usage([
      [1, 12],
      [2, 6],
      [3, 7],
    ])
    const summary = summariseOrganisation(
      [user(1), user(2), user(3, FINANCE)],
      [],
      report,
      REFERENCE
    )

    const companyTotal = report.employees.reduce(
      (total, entry) => total + entry.total_days_used,
      0
    )
    expect(
      summary.byDepartment.reduce((total, row) => total + row.days, 0)
    ).toBe(companyTotal)
    expect(summary.byDepartment).toEqual([
      { name: 'Engineering', days: 18 },
      { name: 'Finance', days: 7 },
    ])
  })

  it('reports a zero average rather than dividing by no employees', () => {
    const summary = summariseOrganisation([], [], NO_USAGE, REFERENCE)

    expect(summary.averageDaysPerEmployee).toBe(0)
    expect(summary.staffOnLeavePercent).toBe(0)
    expect(summary.employees).toBe(0)
    expect(summary.byDepartment).toEqual([])
  })

  it('excludes requests raised in the previous leave year', () => {
    const summary = summariseOrganisation(
      [user(1)],
      [
        request(1, '2026-07-20', '2026-07-21', 'Pending', 1, '2026-07-02'),
        request(2, '2026-07-20', '2026-07-21', 'Pending', 1, '2025-07-02'),
      ],
      NO_USAGE,
      new Date(2026, 6, 15)
    )

    expect(summary.requestsThisMonth).toBe(1)
  })

  it('lists a department nobody has taken leave from at zero days', () => {
    const summary = summariseOrganisation(
      [user(1), user(2, FINANCE)],
      [],
      usage([[1, 9]]),
      REFERENCE
    )

    expect(summary.departments).toBe(2)
    expect(summary.byDepartment).toEqual([
      { name: 'Engineering', days: 9 },
      { name: 'Finance', days: 0 },
    ])
  })
})
