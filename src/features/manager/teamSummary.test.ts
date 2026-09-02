import { describe, expect, it } from 'vitest'
import {
  directReports,
  summariseTeam,
  teamThisWeek,
} from '@/features/manager/teamSummary'
import type { CalendarEntry, LeaveRequest } from '@/types/api'

const WEDNESDAY = new Date(2026, 6, 15)

const DEPARTMENTS = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Design' },
]

function pendingRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 1,
    employee_id: 4,
    employee_name: 'David Jones',
    department_id: 1,
    department_name: 'Engineering',
    leave_type: 'Vacation',
    start_date: '2026-08-10',
    end_date: '2026-08-14',
    days_requested: 5,
    date_requested: '2026-07-02',
    status: 'Pending',
    reason: null,
    manager_note: null,
    reviewed_by_name: null,
    ...overrides,
  }
}

function calendarEntry(overrides: Partial<CalendarEntry> = {}): CalendarEntry {
  return {
    employee_id: 5,
    name: 'Amara Nwosu',
    department_id: 1,
    leave_type: 'Vacation',
    start_date: '2026-09-01',
    end_date: '2026-09-04',
    status: 'Approved',
    ...overrides,
  }
}

describe('assembling the list of direct reports', () => {
  it('draws on both the pending queue and the calendar', () => {
    const members = directReports(
      [pendingRequest({ employee_id: 4, employee_name: 'David Jones' })],
      [calendarEntry({ employee_id: 5, name: 'Amara Nwosu' })]
    )

    expect(members).toEqual([
      { employee_id: 5, name: 'Amara Nwosu', department_name: null },
      { employee_id: 4, name: 'David Jones', department_name: 'Engineering' },
    ])
  })

  it('lists an employee once however many times they appear', () => {
    const members = directReports(
      [
        pendingRequest({ id: 1, employee_id: 4 }),
        pendingRequest({ id: 2, employee_id: 4 }),
      ],
      [
        calendarEntry({ employee_id: 4, name: 'David Jones' }),
        calendarEntry({ employee_id: 4, name: 'David Jones' }),
      ]
    )

    expect(members).toHaveLength(1)
  })

  it('keeps the manager out of their own team list', () => {
    const members = directReports(
      [pendingRequest({ employee_id: 2, employee_name: 'Sam Patel' })],
      [calendarEntry({ employee_id: 2, name: 'Sam Patel' })],
      2
    )

    expect(members).toEqual([])
  })

  it('falls back to the employee id when no name came back', () => {
    const members = directReports(
      [pendingRequest({ employee_id: 9, employee_name: null })],
      []
    )

    expect(members[0]?.name).toBe('Employee #9')
  })

  it('returns nobody when there is no leave activity at all', () => {
    expect(directReports([], [])).toEqual([])
  })
})

describe('summariseTeam', () => {
  it('counts every request still awaiting the manager', () => {
    const summary = summariseTeam(
      [
        pendingRequest({ id: 1, employee_id: 4 }),
        pendingRequest({ id: 2, employee_id: 5 }),
      ],
      [],
      WEDNESDAY
    )

    expect(summary.pending).toBe(2)
  })

  it('marks only the requests starting on or before the end of this week', () => {
    const summary = summariseTeam(
      [
        pendingRequest({ id: 1, start_date: '2026-07-16' }),
        pendingRequest({ id: 2, start_date: '2026-07-19' }),
        pendingRequest({ id: 3, start_date: '2026-07-20' }),
      ],
      [],
      WEDNESDAY
    )

    expect(summary.urgent).toBe(2)
  })

  it('counts only approved leave spanning today as away today', () => {
    const summary = summariseTeam(
      [],
      [
        calendarEntry({
          employee_id: 4,
          start_date: '2026-07-13',
          end_date: '2026-07-17',
        }),
        calendarEntry({
          employee_id: 5,
          start_date: '2026-07-15',
          end_date: '2026-07-15',
          status: 'Pending',
        }),
        calendarEntry({
          employee_id: 6,
          start_date: '2026-07-16',
          end_date: '2026-07-18',
        }),
      ],
      WEDNESDAY
    )

    expect(summary.onLeaveToday).toBe(1)
  })

  it('reads coverage as the share of the team not away this week', () => {
    const summary = summariseTeam(
      [
        pendingRequest({ id: 1, employee_id: 4 }),
        pendingRequest({ id: 2, employee_id: 5 }),
        pendingRequest({ id: 3, employee_id: 6 }),
        pendingRequest({ id: 4, employee_id: 7 }),
      ],
      [
        calendarEntry({
          employee_id: 4,
          start_date: '2026-07-13',
          end_date: '2026-07-17',
        }),
      ],
      WEDNESDAY
    )

    expect(summary.teamSize).toBe(4)
    expect(summary.coveragePercent).toBe(75)
  })

  it('reports full coverage rather than dividing by an empty team', () => {
    const summary = summariseTeam([], [], WEDNESDAY)

    expect(summary.teamSize).toBe(0)
    expect(summary.coveragePercent).toBe(100)
  })

  it('counts approved leave starting in the current month only', () => {
    const summary = summariseTeam(
      [],
      [
        calendarEntry({ employee_id: 4, start_date: '2026-07-01' }),
        calendarEntry({ employee_id: 5, start_date: '2026-07-28' }),
        calendarEntry({ employee_id: 6, start_date: '2026-06-30' }),
        calendarEntry({ employee_id: 7, start_date: '2026-08-01' }),
      ],
      WEDNESDAY
    )

    expect(summary.approvedThisMonth).toBe(2)
  })
})

describe('teamThisWeek', () => {
  it('lists approved leave overlapping this week with its department', () => {
    const week = teamThisWeek(
      [
        calendarEntry({
          employee_id: 4,
          name: 'David Jones',
          department_id: 2,
          start_date: '2026-07-16',
          end_date: '2026-07-17',
        }),
        calendarEntry({
          employee_id: 5,
          name: 'Amara Nwosu',
          department_id: 1,
          start_date: '2026-07-13',
          end_date: '2026-07-14',
        }),
      ],
      DEPARTMENTS,
      WEDNESDAY
    )

    expect(week.map((m) => [m.name, m.department_name])).toEqual([
      ['Amara Nwosu', 'Engineering'],
      ['David Jones', 'Design'],
    ])
  })

  it('leaves out leave in another week and anything not approved', () => {
    const week = teamThisWeek(
      [
        calendarEntry({ employee_id: 4, start_date: '2026-08-03' }),
        calendarEntry({
          employee_id: 5,
          start_date: '2026-07-15',
          end_date: '2026-07-15',
          status: 'Pending',
        }),
      ],
      DEPARTMENTS,
      WEDNESDAY
    )

    expect(week).toEqual([])
  })
})
