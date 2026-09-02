import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setStoredToken } from '@/api/token'
import { AuthProvider } from '@/features/auth/auth'
import { makeUserJwt } from '@/test-support/jwt'
import type {
  CalendarEntry,
  LeaveRequest,
  OwnLeaveRequest,
  RemainingLeave,
  UserProfile,
} from '@/types/api'
import ManagerDashboard from './ManagerDashboard'

const MANAGER_ID = 2

const NOW = new Date(2026, 6, 15, 9)

const PROFILE: UserProfile = {
  id: MANAGER_ID,
  firstName: 'Maya',
  lastName: 'Bennett',
  email: 'maya.bennett@company.com',
  role: 'Manager',
  annualLeaveAllowance: 25,
  department: { id: 1, name: 'Commercial' },
  jobRole: { id: 1, name: 'Manager' },
}

const REMAINING: RemainingLeave = {
  annual_allowance: 25,
  days_used: 7,
  days_remaining: 18,
}

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
    start_date: '2026-07-13',
    end_date: '2026-07-17',
    status: 'Approved',
    ...overrides,
  }
}

const OWN_REQUESTS: OwnLeaveRequest[] = [
  {
    id: 90,
    leave_type: 'Vacation',
    start_date: '2026-08-10',
    end_date: '2026-08-14',
    days_requested: 5,
    date_requested: '2026-07-02',
    status: 'Pending',
    reason: null,
    manager_note: null,
  },
]

interface StubOptions {
  pending?: LeaveRequest[]
  calendar?: CalendarEntry[]
  own?: OwnLeaveRequest[]
}

function stubApi({
  pending = [pendingRequest()],
  calendar = [calendarEntry()],
  own = OWN_REQUESTS,
}: StubOptions = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const data = url.includes('/api/users/me')
      ? PROFILE
      : url.includes('/pending/manager/')
        ? pending
        : url.includes('/calendar')
          ? calendar
          : url.includes('/api/departments')
            ? [{ id: 1, name: 'Engineering', userCount: 3 }]
            : url.includes('/status/')
              ? own
              : url.includes('/remaining/')
                ? REMAINING
                : []
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
    makeUserJwt({
      id: MANAGER_ID,
      email: 'maya.bennett@company.com',
      role: 'Manager',
    })
  )
  render(
    <MemoryRouter>
      <AuthProvider>
        <ManagerDashboard />
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
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('the manager dashboard header', () => {
  it('greets the manager by name instead of naming the screen', async () => {
    stubApi()
    renderDashboard()

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Good morning, Maya'
    )
    expect(screen.queryByText('Manager dashboard')).not.toBeInTheDocument()
  })

  it('states the date and how many requests need review', async () => {
    stubApi({
      pending: [
        pendingRequest({ id: 1 }),
        pendingRequest({ id: 2, employee_id: 5 }),
      ],
    })
    renderDashboard()

    expect(
      await screen.findByText(
        /Wednesday, 15 July 2026 • 2 requests need your review/
      )
    ).toBeInTheDocument()
  })
})

describe('the manager summary figures', () => {
  it('shows pending, away today, coverage and approvals this month', async () => {
    stubApi({
      pending: [
        pendingRequest({ id: 1, employee_id: 4, start_date: '2026-07-16' }),
        pendingRequest({ id: 2, employee_id: 5, start_date: '2026-09-01' }),
      ],
      calendar: [
        calendarEntry({
          employee_id: 5,
          start_date: '2026-07-13',
          end_date: '2026-07-17',
        }),
      ],
    })
    renderDashboard()

    expect(await statCard('Pending approvals')).toHaveTextContent('2 requests')
    expect(await statCard('Pending approvals')).toHaveTextContent(
      '1 starting this week'
    )
    expect(await statCard('On leave today')).toHaveTextContent('1 person')
    expect(await statCard('On leave today')).toHaveTextContent(
      'of 2 in your team'
    )
    expect(await statCard('Team coverage')).toHaveTextContent('50%')
    expect(await statCard('Approved this month')).toHaveTextContent('1 request')
  })
})

describe('the manager dashboard widgets', () => {
  it('shows every widget from the design', async () => {
    stubApi()
    renderDashboard()

    expect(await screen.findByTestId('approvals-queue')).toBeInTheDocument()
    expect(screen.getByTestId('team-this-week')).toBeInTheDocument()
    expect(screen.getByTestId('plan-escape-banner')).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'My requests' })
    ).toBeInTheDocument()
  })

  it('no longer shows the team leave balances table', async () => {
    stubApi()
    renderDashboard()

    await screen.findByTestId('approvals-queue')
    expect(screen.queryByTestId('team-balances')).not.toBeInTheDocument()
    expect(screen.queryByText('Team leave balances')).not.toBeInTheDocument()
  })

  it('lists who is off this week with their department', async () => {
    stubApi({
      calendar: [
        calendarEntry({
          employee_id: 5,
          name: 'Amara Nwosu',
          start_date: '2026-07-13',
          end_date: '2026-07-17',
        }),
      ],
    })
    renderDashboard()

    const section = await screen.findByTestId('team-this-week')
    const member = within(section).getByTestId('team-week-member')

    expect(member).toHaveTextContent('Amara Nwosu')
    expect(member).toHaveTextContent('Engineering')
    expect(member).toHaveTextContent('13 Jul 2026 – 17 Jul 2026')
  })

  it('queues each pending request with an approve and a decline control', async () => {
    stubApi({ pending: [pendingRequest({ employee_name: 'David Jones' })] })
    renderDashboard()

    const queue = await screen.findByTestId('approvals-queue')
    expect(within(queue).getByText('David Jones')).toBeInTheDocument()
    expect(
      within(queue).getByRole('button', { name: 'Approve' })
    ).toBeInTheDocument()
    expect(
      within(queue).getByRole('button', { name: 'Decline' })
    ).toBeInTheDocument()
  })

  it('approves straight from the queue', async () => {
    const fetchMock = stubApi({ pending: [pendingRequest({ id: 77 })] })
    renderDashboard()

    const queue = await screen.findByTestId('approvals-queue')
    within(queue).getByRole('button', { name: 'Approve' }).click()

    await waitFor(() => {
      const approved = fetchMock.mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes('/leave-requests/approve'))
      expect(approved.length).toBeGreaterThan(0)
    })
  })
})
