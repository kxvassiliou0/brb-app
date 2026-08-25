import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setStoredToken } from '@/lib/api'
import { AuthProvider } from '@/lib/auth'
import { HOME_PATH, type Role } from '@/lib/routeAccess'
import { REPORTS_COVERAGE_NOTE } from '@/lib/teamBalances'
import { routes } from '@/routes'
import { makeUserJwt } from '@/test/jwt'
import type { CalendarEntry, LeaveRequest, RemainingLeave } from '@/types/api'

const MANAGER_ID = 2

const OTHER_MANAGERS_REPORT_ID = 99

function teamRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 50,
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

interface StubOptions {
  pending?: LeaveRequest[]
  calendar?: CalendarEntry[]
  balances?: Record<number, RemainingLeave>
  forbidden?: number[]
  pendingFails?: boolean
  calendarFails?: boolean
}

function jsonOk(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data }),
  } as unknown as Response
}

function jsonError(status: number, message: string): Response {
  return {
    ok: false,
    status,
    json: async () => ({ error: message }),
  } as unknown as Response
}

function stubApi({
  pending = [],
  calendar = [],
  balances = {},
  forbidden = [],
  pendingFails = false,
  calendarFails = false,
}: StubOptions = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)

    const remaining = url.match(/\/remaining\/(\d+)/)
    if (remaining) {
      const id = Number(remaining[1])
      if (forbidden.includes(id)) {
        return jsonError(
          403,
          'You are not authorised to view leave balance for this employee'
        )
      }
      return jsonOk(balances[id] ?? balance())
    }

    if (url.includes('/pending/manager/')) {
      if (pendingFails) return jsonError(500, 'Queue unavailable')
      return jsonOk(pending)
    }

    if (url.includes('/calendar')) {
      if (calendarFails) return jsonError(500, 'Calendar unavailable')
      return jsonOk(calendar)
    }

    return jsonOk([])
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderDashboard(role: Role = 'Manager') {
  setStoredToken(
    makeUserJwt({ id: MANAGER_ID, email: `${role}@company.com`, role })
  )
  render(
    <AuthProvider>
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: [HOME_PATH] })}
      />
    </AuthProvider>
  )
}

async function balanceRows() {
  const section = await screen.findByTestId('team-balances')
  const table = await within(section).findByTestId('data-table')
  return within(table).findAllByRole('row')
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the team leave balances table', () => {
  it("lists each report's entitlement, days used and days remaining", async () => {
    stubApi({
      pending: [teamRequest({ employee_id: 4, employee_name: 'David Jones' })],
      balances: {
        4: { annual_allowance: 25, days_used: 7, days_remaining: 18 },
      },
    })
    renderDashboard()

    const rows = await balanceRows()
    const david = rows.find((row) => row.textContent?.includes('David Jones'))

    expect(david).toBeDefined()
    expect(david).toHaveTextContent('25 days')
    expect(david).toHaveTextContent('7 days')
    expect(david).toHaveTextContent('18 days')
  })

  it('builds the list from the pending queue and the calendar together', async () => {
    stubApi({
      pending: [teamRequest({ employee_id: 4, employee_name: 'David Jones' })],
      calendar: [calendarEntry({ employee_id: 5, name: 'Amara Nwosu' })],
    })
    renderDashboard()

    const section = await screen.findByTestId('team-balances')
    expect(await within(section).findByText('David Jones')).toBeInTheDocument()
    expect(await within(section).findByText('Amara Nwosu')).toBeInTheDocument()
  })

  it('shows only the reports the signed-in manager is given', async () => {
    const fetchMock = stubApi({
      pending: [teamRequest({ employee_id: 4, employee_name: 'David Jones' })],
      calendar: [calendarEntry({ employee_id: 5, name: 'Amara Nwosu' })],
    })
    renderDashboard()

    const rows = await balanceRows()
    const names = rows
      .slice(1)
      .map((row) => row.textContent ?? '')
      .join(' ')

    expect(names).toContain('David Jones')
    expect(names).toContain('Amara Nwosu')

    const queried = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.includes('/remaining/'))

    expect(queried).toHaveLength(2)
    expect(queried.join(' ')).not.toContain(
      `/remaining/${OTHER_MANAGERS_REPORT_ID}`
    )
  })

  it('scopes both list sources to the signed-in manager', async () => {
    const fetchMock = stubApi({ pending: [teamRequest()] })
    renderDashboard()

    await balanceRows()

    const queue = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.includes('/pending/manager/'))

    expect(queue.length).toBeGreaterThan(0)
    for (const url of queue) {
      expect(url).toContain(`/pending/manager/${MANAGER_ID}`)
    }
  })

  it('never asks for the balance of somebody outside the team', async () => {
    const fetchMock = stubApi({
      pending: [teamRequest({ employee_id: 4 })],
    })
    renderDashboard()

    await balanceRows()

    const queried = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.includes('/remaining/'))

    expect(queried.every((url) => url.endsWith('/remaining/4'))).toBe(true)
  })
})

describe('when a balance cannot be read', () => {
  it('keeps every other row when one employee returns a 403', async () => {
    stubApi({
      pending: [
        teamRequest({ id: 1, employee_id: 4, employee_name: 'David Jones' }),
        teamRequest({ id: 2, employee_id: 5, employee_name: 'Amara Nwosu' }),
        teamRequest({ id: 3, employee_id: 6, employee_name: 'Priya Shah' }),
      ],
      balances: {
        4: balance({ days_remaining: 18 }),
        6: balance({ days_remaining: 3 }),
      },
      forbidden: [5],
    })
    renderDashboard()

    const rows = await balanceRows()

    expect(rows.slice(1)).toHaveLength(3)
    expect(
      rows.find((row) => row.textContent?.includes('David Jones'))
    ).toHaveTextContent('18 days')
    expect(
      rows.find((row) => row.textContent?.includes('Priya Shah'))
    ).toHaveTextContent('3 days')
  })

  it('marks just that employee unavailable rather than blanking the table', async () => {
    stubApi({
      pending: [
        teamRequest({ id: 1, employee_id: 4, employee_name: 'David Jones' }),
        teamRequest({ id: 2, employee_id: 5, employee_name: 'Amara Nwosu' }),
      ],
      forbidden: [5],
    })
    renderDashboard()

    const rows = await balanceRows()
    const amara = rows.find((row) => row.textContent?.includes('Amara Nwosu'))

    expect(amara).toHaveTextContent('Unavailable')
    expect(
      rows.find((row) => row.textContent?.includes('David Jones'))
    ).not.toHaveTextContent('Unavailable')
    expect(screen.getAllByTestId('balance-unavailable')).toHaveLength(1)
  })

  it('still lists the team when the calendar fails but the queue answers', async () => {
    stubApi({
      pending: [teamRequest({ employee_id: 4, employee_name: 'David Jones' })],
      calendarFails: true,
    })
    renderDashboard()

    const section = await screen.findByTestId('team-balances')
    expect(await within(section).findByText('David Jones')).toBeInTheDocument()
  })

  it('still lists the team when the queue fails but the calendar answers', async () => {
    stubApi({
      calendar: [calendarEntry({ employee_id: 5, name: 'Amara Nwosu' })],
      pendingFails: true,
    })
    renderDashboard()

    const section = await screen.findByTestId('team-balances')
    expect(await within(section).findByText('Amara Nwosu')).toBeInTheDocument()
  })

  it('offers a retry when neither list source answers', async () => {
    stubApi({ pendingFails: true, calendarFails: true })
    renderDashboard()

    const section = await screen.findByTestId('team-balances')
    expect(
      await within(section).findByRole('button', { name: /try again/i })
    ).toBeInTheDocument()
  })
})

describe('the reports with no leave activity', () => {
  it('shows an empty table rather than an error when nobody has booked leave', async () => {
    stubApi({ pending: [], calendar: [] })
    renderDashboard()

    const section = await screen.findByTestId('team-balances')
    expect(
      await within(section).findByText(
        'Nobody on your team has requested or taken leave yet.'
      )
    ).toBeInTheDocument()
  })

  it('documents that a report with no leave activity will not appear', async () => {
    stubApi({
      pending: [teamRequest({ employee_id: 4, employee_name: 'David Jones' })],
    })
    renderDashboard()

    const note = await screen.findByTestId('reports-coverage-note')
    expect(note).toHaveTextContent(REPORTS_COVERAGE_NOTE)
  })
})
