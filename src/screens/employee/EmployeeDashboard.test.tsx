import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setStoredToken } from '@/lib/api'
import { AuthProvider } from '@/lib/auth'
import { RECENT_REQUEST_LIMIT } from '@/lib/leaveSummary'
import { makeUserJwt } from '@/test/jwt'
import { routes } from '@/routes'
import type {
  LeaveStatus,
  LeaveType,
  OwnLeaveRequest,
  RemainingLeave,
  UserProfile,
} from '@/types/api'

const EMPLOYEE_ID = 1

const NOW = new Date('2026-07-15T09:00:00')

const PROFILE: UserProfile = {
  id: EMPLOYEE_ID,
  firstName: 'Priya',
  lastName: 'Sharma',
  email: 'priya.sharma@company.com',
  role: 'Employee',
  annualLeaveAllowance: 25,
  department: { id: 1, name: 'Design' },
  jobRole: { id: 1, name: 'Contractor' },
}

const BALANCE: RemainingLeave = {
  annual_allowance: 25,
  days_used: 7,
  days_remaining: 18,
}

interface RequestInput {
  id: number
  start_date: string
  end_date: string
  leave_type?: LeaveType
  status?: LeaveStatus
}

function request({
  id,
  start_date,
  end_date,
  leave_type = 'Vacation',
  status = 'Approved',
}: RequestInput): OwnLeaveRequest {
  return {
    id,
    leave_type,
    start_date,
    end_date,
    status,
    reason: null,
    manager_note: null,
  }
}

interface DashboardData {
  profile?: UserProfile
  balance?: RemainingLeave
  requests?: OwnLeaveRequest[]
}

function jsonOk(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data }),
  } as unknown as Response
}

function jsonError(message: string): Response {
  return {
    ok: false,
    status: 500,
    json: async () => ({ error: message }),
  } as unknown as Response
}

function respond(url: string, data: DashboardData): Response {
  if (url.includes('/api/users/me')) return jsonOk(data.profile ?? PROFILE)
  if (url.includes('/api/leave-requests/remaining'))
    return jsonOk(data.balance ?? BALANCE)
  return jsonOk(data.requests ?? [])
}

function stubDashboard(data: DashboardData): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => respond(String(input), data))
  )
}

function renderDashboard(): void {
  setStoredToken(
    makeUserJwt({
      id: EMPLOYEE_ID,
      email: 'priya.sharma@company.com',
      role: 'Employee',
    })
  )
  const router = createMemoryRouter(routes, { initialEntries: ['/employee'] })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

function statCard(label: string): HTMLElement {
  const card = screen.getByText(label).closest('[data-testid="stat-card"]')
  if (!card) throw new Error(`No stat card labelled "${label}"`)
  return card as HTMLElement
}

async function statValue(label: string): Promise<string> {
  await screen.findAllByTestId('stat-card')
  return within(statCard(label)).getByTestId('stat-value').textContent ?? ''
}

function tableRows(): HTMLElement[] {
  return within(screen.getByTestId('data-table')).getAllByRole('row').slice(1)
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('employee dashboard summary figures', () => {
  it('renders each figure from the value its endpoint returned', async () => {
    stubDashboard({
      requests: [
        request({ id: 1, start_date: '2026-05-01', end_date: '2026-05-07' }),
        request({
          id: 2,
          start_date: '2026-09-01',
          end_date: '2026-09-02',
          status: 'Pending',
        }),
        request({
          id: 3,
          start_date: '2026-10-01',
          end_date: '2026-10-01',
          status: 'Pending',
        }),
        request({
          id: 4,
          start_date: '2026-06-01',
          end_date: '2026-06-03',
          leave_type: 'Sick',
        }),
      ],
    })
    renderDashboard()

    expect(await statValue('Remaining leave')).toBe('18 days')
    expect(await statValue('Booked this year')).toBe('7 days')
    expect(await statValue('Pending approval')).toBe('2 requests')
    expect(await statValue('Sick leave taken')).toBe('3 days')
    expect(
      within(statCard('Remaining leave')).getByText('of 25 annual allowance')
    ).toBeInTheDocument()
  })

  it('counts only Sick requests in the sick leave figure', async () => {
    stubDashboard({
      requests: [
        request({ id: 1, start_date: '2026-05-01', end_date: '2026-05-10' }),
        request({
          id: 2,
          start_date: '2026-06-01',
          end_date: '2026-06-02',
          leave_type: 'Sick',
        }),
        request({
          id: 3,
          start_date: '2026-06-10',
          end_date: '2026-06-14',
          leave_type: 'Personal',
        }),
      ],
    })
    renderDashboard()

    expect(await statValue('Sick leave taken')).toBe('2 days')
  })

  it('states the leave year as 1 April to 31 March', async () => {
    stubDashboard({})
    renderDashboard()

    expect(
      await screen.findByText(/Leave year 1 April to 31 March/)
    ).toBeInTheDocument()
  })

  it('greets the employee by the name from the profile endpoint', async () => {
    stubDashboard({})
    renderDashboard()

    expect(
      await screen.findByRole('heading', { name: 'Good morning, Priya' })
    ).toBeInTheDocument()
  })

  it('labels day counts as days rather than working days', async () => {
    stubDashboard({
      requests: [
        request({ id: 1, start_date: '2026-05-01', end_date: '2026-05-07' }),
      ],
    })
    renderDashboard()

    await screen.findByTestId('data-table')
    expect(screen.queryByText(/working days/i)).not.toBeInTheDocument()
    expect(
      within(screen.getByTestId('data-table')).getByText('Days')
    ).toBeInTheDocument()
  })
})

describe('employee dashboard recent requests', () => {
  it('caps the list and orders it most recent first', async () => {
    stubDashboard({
      requests: [
        request({ id: 1, start_date: '2026-04-01', end_date: '2026-04-02' }),
        request({ id: 2, start_date: '2026-09-01', end_date: '2026-09-02' }),
        request({ id: 3, start_date: '2026-05-01', end_date: '2026-05-02' }),
        request({ id: 4, start_date: '2026-12-01', end_date: '2026-12-02' }),
        request({ id: 5, start_date: '2026-06-01', end_date: '2026-06-02' }),
        request({ id: 6, start_date: '2026-07-01', end_date: '2026-07-02' }),
        request({ id: 7, start_date: '2026-08-01', end_date: '2026-08-02' }),
      ],
    })
    renderDashboard()

    await screen.findByTestId('data-table')
    const rows = tableRows()
    expect(rows).toHaveLength(RECENT_REQUEST_LIMIT)
    expect(rows[0]).toHaveTextContent('1 Dec 2026 – 2 Dec 2026')
    expect(rows[1]).toHaveTextContent(/1 Sept? 2026 – 2 Sept? 2026/)
    expect(rows[4]).toHaveTextContent('1 Jun 2026 – 2 Jun 2026')
    expect(
      screen.queryByText('1 Apr 2026 – 2 Apr 2026')
    ).not.toBeInTheDocument()
  })

  it('links to the full list of requests', async () => {
    stubDashboard({})
    renderDashboard()

    const link = await screen.findByRole('link', { name: 'View all' })
    expect(link).toHaveAttribute('href', '/employee/my-requests')
  })
})

describe('employee dashboard states', () => {
  it('explains an empty history rather than showing bare zeroes', async () => {
    stubDashboard({ requests: [] })
    renderDashboard()

    expect(
      await screen.findByText(
        'You have not requested any time off yet, so there is nothing to summarise.'
      )
    ).toBeInTheDocument()
    expect(screen.getByTestId('table-empty-state')).toBeInTheDocument()
  })

  it('renders an error state with a retry that reloads the figures', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonError('Service unavailable'))
      .mockResolvedValueOnce(jsonError('Service unavailable'))
      .mockResolvedValueOnce(jsonError('Service unavailable'))
      .mockImplementation(async (input: RequestInfo | URL) =>
        respond(String(input), {
          requests: [
            request({
              id: 1,
              start_date: '2026-05-01',
              end_date: '2026-05-07',
            }),
          ],
        })
      )
    vi.stubGlobal('fetch', fetchMock)
    renderDashboard()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Service unavailable')
    expect(screen.queryByTestId('stat-card')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
    expect(await statValue('Remaining leave')).toBe('18 days')
  })
})
