import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setStoredToken } from '@/api/token'
import { AuthProvider } from '@/features/auth/auth'
import { getLeaveYear } from '@/lib/leaveYear'
import { makeUserJwt } from '@/test-support/jwt'
import type {
  LeaveRequest,
  LeaveUsageReport,
  OwnLeaveRequest,
  RemainingLeave,
  UserListItem,
  UserProfile,
} from '@/types/api'
import AdminDashboard from './AdminDashboard'

const ADMIN_ID = 1

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

const PROFILE: UserProfile = { ...user(ADMIN_ID), firstName: 'Ethan' }

const TODAY = new Date().toISOString().slice(0, 10)

const THIS_MONTH = `${TODAY.slice(0, 7)}-01`

const PREVIOUS_LEAVE_YEAR = `${Number(getLeaveYear().start.slice(0, 4)) - 1}-05-02`

function request(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 1,
    employee_id: 1,
    employee_name: 'Person1',
    department_id: 1,
    department_name: 'Engineering',
    leave_type: 'Vacation',
    start_date: TODAY,
    end_date: TODAY,
    days_requested: 1,
    date_requested: THIS_MONTH,
    status: 'Approved',
    reason: null,
    manager_note: null,
    reviewed_by_name: null,
    ...overrides,
  }
}

const USERS = [user(1), user(2), user(3, FINANCE), user(4, FINANCE)]

const REQUESTS = [
  request({ id: 1, employee_id: 1 }),
  request({ id: 2, employee_id: 2, status: 'Pending' }),
  request({
    id: 3,
    employee_id: 3,
    start_date: PREVIOUS_LEAVE_YEAR,
    end_date: PREVIOUS_LEAVE_YEAR,
    date_requested: PREVIOUS_LEAVE_YEAR,
  }),
]

const USAGE: LeaveUsageReport = {
  scope: 'company-wide',
  employees: [
    {
      employee_id: 1,
      name: 'Person1',
      department_id: 1,
      breakdown: { Vacation: 30, Sick: 0, Personal: 0 },
      total_days_used: 30,
    },
    {
      employee_id: 3,
      name: 'Person3',
      department_id: 2,
      breakdown: { Vacation: 10, Sick: 0, Personal: 0 },
      total_days_used: 10,
    },
  ],
}

const OWN_REQUESTS: OwnLeaveRequest[] = [
  {
    id: 90,
    leave_type: 'Vacation',
    start_date: '2026-08-10',
    end_date: '2026-08-14',
    days_requested: 5,
    date_requested: THIS_MONTH,
    status: 'Pending',
    reason: null,
    manager_note: null,
  },
]

const REMAINING: RemainingLeave = {
  annual_allowance: 25,
  days_used: 7,
  days_remaining: 18,
}

function stubApi() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const data = url.includes('/api/users/me')
      ? PROFILE
      : url.includes('/reports/usage')
        ? USAGE
        : url.includes('/status/')
          ? OWN_REQUESTS
          : url.includes('/remaining/')
            ? REMAINING
            : url.includes('/api/users')
              ? USERS
              : REQUESTS
    return {
      ok: true,
      status: 200,
      json: async () => ({ data }),
    } as unknown as Response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderDashboard() {
  setStoredToken(
    makeUserJwt({ id: ADMIN_ID, email: 'admin@company.com', role: 'Admin' })
  )
  render(
    <MemoryRouter>
      <AuthProvider>
        <AdminDashboard />
      </AuthProvider>
    </MemoryRouter>
  )
}

async function statCard(label: string) {
  const cards = await screen.findAllByTestId('stat-card')
  const card = cards.find((node) => node.textContent?.includes(label))
  expect(card).toBeDefined()
  return card as HTMLElement
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the organisation-wide summary', () => {
  it('shows each figure taken from the endpoint that owns it', async () => {
    stubApi()
    renderDashboard()

    expect(await statCard('Total employees')).toHaveTextContent('4')
    expect(await statCard('Total employees')).toHaveTextContent(
      'across 2 departments'
    )
    expect(await statCard('Requests this month')).toHaveTextContent('2')
    expect(await statCard('Requests this month')).toHaveTextContent(
      '1 still pending'
    )
    expect(await statCard('On leave today')).toHaveTextContent('1 person')
    expect(await statCard('On leave today')).toHaveTextContent('25% of staff')
    expect(await statCard('Avg leave taken')).toHaveTextContent('10 days')
    expect(await statCard('Avg leave taken')).toHaveTextContent('per employee')
  })

  it('greets the administrator by the name on their profile', async () => {
    stubApi()
    renderDashboard()

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Ethan'
    )
  })

  it('asks for leave usage across the 1 April to 31 March leave year', async () => {
    const fetchMock = stubApi()
    renderDashboard()
    await statCard('Avg leave taken')

    const leaveYear = getLeaveYear()
    const usageCall = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .find((url) => url.includes('/reports/usage'))

    expect(usageCall).toContain(`from=${leaveYear.start}`)
    expect(usageCall).toContain(`to=${leaveYear.end}`)
  })

  it('breaks leave down by department', async () => {
    stubApi()
    renderDashboard()

    const section = await screen.findByTestId('leave-by-department')
    const rows = within(section).getAllByTestId('department-leave')

    expect(rows.map((row) => row.textContent)).toEqual([
      'Engineering30 days',
      'Finance10 days',
    ])
  })

  it('shows the admin their own requests alongside the company figures', async () => {
    stubApi()
    renderDashboard()

    const section = await screen.findByRole('region', { name: 'My requests' })
    expect(
      within(section).getByText('10 Aug 2026 – 14 Aug 2026')
    ).toBeInTheDocument()
    expect(
      within(section).getByRole('link', { name: 'View all' })
    ).toHaveAttribute('href', '/requests?scope=mine')
  })

  it('invites the admin to book their own remaining leave', async () => {
    stubApi()
    renderDashboard()

    const banner = await screen.findByTestId('plan-escape-banner')
    expect(banner).toHaveTextContent(
      'You have 18 days left. Plan your next escape'
    )
  })

  it('labels day counts as days rather than working days', async () => {
    stubApi()
    renderDashboard()

    await statCard('Avg leave taken')
    expect(screen.queryByText(/working days/i)).not.toBeInTheDocument()
  })
})
