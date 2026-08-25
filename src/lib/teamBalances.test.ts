import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '@/lib/api'
import {
  directReports,
  fetchTeamBalances,
  remainingLeavePath,
  type TeamMember,
} from '@/lib/teamBalances'
import type { CalendarEntry, LeaveRequest, RemainingLeave } from '@/types/api'

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
    ...overrides,
  }
}

function balance(overrides: Partial<RemainingLeave> = {}): RemainingLeave {
  return {
    annual_allowance: 25,
    days_used: 7,
    days_remaining: 18,
    ...overrides,
  }
}

function member(id: number, name: string): TeamMember {
  return { employee_id: id, name, department_name: null }
}

function jsonOk(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data }),
  } as unknown as Response
}

function forbidden(): Response {
  return {
    ok: false,
    status: 403,
    json: async () => ({
      error: 'You are not authorised to view leave balance for this employee',
    }),
  } as unknown as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

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
    expect(members[0]).toEqual({
      employee_id: 4,
      name: 'David Jones',
      department_name: 'Engineering',
    })
  })

  it('holds nobody but the signed-in manager’s own reports', () => {
    const managerId = 2
    const members = directReports(
      [pendingRequest({ employee_id: 4 })],
      [calendarEntry({ employee_id: 5 })],
      managerId
    )

    expect(members.map((m) => m.employee_id)).toEqual([5, 4])
    expect(members.map((m) => m.employee_id)).not.toContain(managerId)
  })

  it('keeps the manager out of their own team list', () => {
    const managerId = 2
    const members = directReports(
      [pendingRequest({ employee_id: managerId, employee_name: 'Sam Patel' })],
      [calendarEntry({ employee_id: managerId, name: 'Sam Patel' })],
      managerId
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

  it('prefers a real name over the id fallback whichever source carries it', () => {
    const members = directReports(
      [pendingRequest({ employee_id: 9, employee_name: null })],
      [calendarEntry({ employee_id: 9, name: 'Priya Shah' })]
    )

    expect(members).toEqual([
      { employee_id: 9, name: 'Priya Shah', department_name: 'Engineering' },
    ])
  })

  it('returns nobody when there is no leave activity at all', () => {
    expect(directReports([], [])).toEqual([])
  })
})

describe('fetching a balance for each report', () => {
  it('asks the per-employee endpoint the permission check allows', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonOk(balance()))
    vi.stubGlobal('fetch', fetchMock)

    await fetchTeamBalances([member(4, 'David Jones')])

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      remainingLeavePath(4)
    )
  })

  it('keeps the other rows when one employee returns a 403', async () => {
    const members: TeamMember[] = [
      member(4, 'David Jones'),
      member(5, 'Amara Nwosu'),
      member(6, 'Priya Shah'),
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes(remainingLeavePath(5))
          ? forbidden()
          : jsonOk(balance())
      )
    )

    const rows = await fetchTeamBalances(members)

    expect(rows).toHaveLength(3)
    expect(rows[0]?.balance).toEqual(balance())
    expect(rows[1]?.balance).toBeNull()
    expect(rows[2]?.balance).toEqual(balance())
  })

  it('resolves rather than rejecting when a fetch throws outright', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new ApiRequestError('Network down', 500)
      })
    )

    await expect(
      fetchTeamBalances([member(4, 'David Jones')])
    ).resolves.toEqual([{ ...member(4, 'David Jones'), balance: null }])
  })

  it('pairs every balance with the employee that asked for it', async () => {
    const members: TeamMember[] = [
      member(4, 'David Jones'),
      member(5, 'Amara Nwosu'),
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        jsonOk(
          String(input).includes(remainingLeavePath(4))
            ? balance({ days_remaining: 18 })
            : balance({ days_remaining: 3 })
        )
      )
    )

    const rows = await fetchTeamBalances(members)

    expect(rows[0]?.balance?.days_remaining).toBe(18)
    expect(rows[1]?.balance?.days_remaining).toBe(3)
  })
})
