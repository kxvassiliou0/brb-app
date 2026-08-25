import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setStoredToken } from '@/lib/api'
import { AuthProvider } from '@/lib/auth'
import { DATE_STRIP_DAYS } from '@/lib/requestFilters'
import { REQUESTS_PATH, type Role } from '@/lib/routeAccess'
import { routes } from '@/routes'
import { makeUserJwt } from '@/test/jwt'
import type { LeaveRequest, OwnLeaveRequest, RemainingLeave } from '@/types/api'

const USER_ID = 2

const CONFIRMATION = 'Leave request has been submitted for review'

const BALANCE: RemainingLeave = {
  annual_allowance: 25,
  days_used: 7,
  days_remaining: 18,
}

function ownRequest(overrides: Partial<OwnLeaveRequest> = {}): OwnLeaveRequest {
  return {
    id: 1,
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
    ...overrides,
  }
}

interface StubOptions {
  own?: OwnLeaveRequest[]
  team?: LeaveRequest[]
  queues?: Record<number, LeaveRequest[]>
  allRequests?: LeaveRequest[]
  departments?: { id: number; name: string }[]
}

function jsonOk(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data }),
  } as unknown as Response
}

function stubApi({
  own = [],
  team = [],
  queues,
  allRequests = team,
  departments = [],
}: StubOptions = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/remaining/')) return jsonOk(BALANCE)
    if (url.includes('/status/')) return jsonOk(own)
    if (url.includes('/api/departments')) return jsonOk(departments)
    const queue = url.match(/\/pending\/manager\/(\d+)/)
    if (queue) return jsonOk(queues ? (queues[Number(queue[1])] ?? []) : team)
    return jsonOk(allRequests)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderRequests(role: Role, state?: unknown) {
  setStoredToken(
    makeUserJwt({ id: USER_ID, email: `${role}@company.com`, role })
  )
  const router = createMemoryRouter(routes, {
    initialEntries: [{ pathname: REQUESTS_PATH, state }],
  })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
  return router
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the booking confirmation', () => {
  it('shows the message the backend returned', async () => {
    stubApi({ own: [ownRequest()] })
    renderRequests('Employee', {
      bookingConfirmation: CONFIRMATION,
      bookingRequestId: 1,
    })

    expect(await screen.findByTestId('booking-confirmation')).toHaveTextContent(
      CONFIRMATION
    )
  })

  it('places the confirmation in a live region so it is announced', async () => {
    stubApi({ own: [ownRequest()] })
    renderRequests('Employee', {
      bookingConfirmation: CONFIRMATION,
      bookingRequestId: 1,
    })

    const confirmation = await screen.findByTestId('booking-confirmation')
    const region = screen.getByTestId('booking-confirmation-region')

    expect(region).toHaveAttribute('role', 'status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toContainElement(confirmation)
  })

  it('renders the live region empty when no booking has just been made', async () => {
    stubApi({ own: [ownRequest()] })
    renderRequests('Employee')

    const region = await screen.findByTestId('booking-confirmation-region')
    expect(region).toBeEmptyDOMElement()
    expect(screen.queryByTestId('booking-confirmation')).not.toBeInTheDocument()
  })

  it('highlights the newly created row', async () => {
    stubApi({
      own: [
        ownRequest({ id: 1, start_date: '2026-08-10', end_date: '2026-08-14' }),
        ownRequest({ id: 2, start_date: '2026-09-01', end_date: '2026-09-02' }),
      ],
    })
    renderRequests('Employee', {
      bookingConfirmation: CONFIRMATION,
      bookingRequestId: 2,
    })

    await screen.findByTestId('data-table')
    const highlighted = document.querySelectorAll('tr[data-highlighted="true"]')
    expect(highlighted).toHaveLength(1)
    expect(highlighted[0]).toHaveTextContent('1 Sept 2026 – 2 Sept 2026')
  })
})

describe('what each role sees', () => {
  it('shows an Employee only their own requests, with no scope toggle', async () => {
    stubApi({ own: [ownRequest()] })
    renderRequests('Employee')

    expect(
      await screen.findByRole('heading', { name: 'My requests' })
    ).toBeInTheDocument()
    expect(screen.queryByTestId('scope-filter')).not.toBeInTheDocument()
  })

  it('opens a Manager on the team queue and offers a My requests toggle', async () => {
    stubApi({ own: [ownRequest()], team: [teamRequest()] })
    renderRequests('Manager')

    expect(
      await screen.findByRole('heading', { name: 'Team requests' })
    ).toBeInTheDocument()
    expect(screen.getByTestId('scope-filter')).toBeInTheDocument()
    expect(await screen.findByText('David Jones')).toBeInTheDocument()
  })

  it("keeps a manager's own request out of the team queue but shows it under My requests", async () => {
    stubApi({
      own: [ownRequest({ id: 7, leave_type: 'Personal' })],
      team: [teamRequest({ id: 50 })],
    })
    renderRequests('Manager')

    expect(await screen.findByText('David Jones')).toBeInTheDocument()
    expect(screen.queryByText('Personal')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'My requests' }))

    expect(await screen.findByText('Personal')).toBeInTheDocument()
    expect(screen.queryByText('David Jones')).not.toBeInTheDocument()
  })
})

describe("the manager's approval queue", () => {
  it('lists only outstanding requests, never decided or cancelled ones', async () => {
    stubApi({
      team: [teamRequest({ id: 50, employee_name: 'David Jones' })],
      allRequests: [
        teamRequest({ id: 60, employee_name: 'Ada Poole', status: 'Approved' }),
        teamRequest({ id: 61, employee_name: 'Ben Cole', status: 'Rejected' }),
        teamRequest({ id: 62, employee_name: 'Cara Lin', status: 'Cancelled' }),
      ],
    })
    renderRequests('Manager')

    expect(await screen.findByText('David Jones')).toBeInTheDocument()
    expect(screen.queryByText('Ada Poole')).not.toBeInTheDocument()
    expect(screen.queryByText('Ben Cole')).not.toBeInTheDocument()
    expect(screen.queryByText('Cara Lin')).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-filter')).not.toBeInTheDocument()
  })

  it("draws the queue from the signed-in manager's own reports", async () => {
    stubApi({
      queues: {
        [USER_ID]: [teamRequest({ id: 50, employee_name: 'David Jones' })],
        [USER_ID + 7]: [
          teamRequest({ id: 70, employee_name: 'Frank Harrison' }),
        ],
      },
    })
    renderRequests('Manager')

    expect(await screen.findByText('David Jones')).toBeInTheDocument()
    expect(screen.queryByText('Frank Harrison')).not.toBeInTheDocument()
  })

  it('offers both an approve and a reject action on every row', async () => {
    stubApi({
      team: [
        teamRequest({ id: 50, employee_name: 'David Jones' }),
        teamRequest({ id: 51, employee_name: 'Eve Knowles' }),
      ],
    })
    renderRequests('Manager')

    await screen.findByText('David Jones')
    const rows = within(screen.getByTestId('data-table'))
      .getAllByRole('row')
      .slice(1)

    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(
        within(row).getByRole('button', { name: 'Approve' })
      ).toBeInTheDocument()
      expect(
        within(row).getByRole('button', { name: 'Decline' })
      ).toBeInTheDocument()
    }
  })

  it('shows an empty state when nothing is awaiting approval', async () => {
    stubApi({ own: [ownRequest()], team: [] })
    renderRequests('Manager')

    expect(
      await screen.findByText('Nothing is waiting for your approval.')
    ).toBeInTheDocument()
  })
})

describe('the date strip', () => {
  const TODAY = new Date('2026-08-17T09:00:00')

  function offsetDate(days: number): string {
    return new Date(TODAY.getTime() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
  }

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(TODAY)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs from today across the next 30 days', async () => {
    stubApi({ team: [teamRequest()] })
    renderRequests('Manager')

    const strip = await screen.findByTestId('request-date-strip')
    const dates = within(strip)
      .getAllByTestId('date-strip-day')
      .map((day) => day.getAttribute('data-date'))

    expect(dates).toHaveLength(DATE_STRIP_DAYS)
    expect(dates[0]).toBe(offsetDate(0))
    expect(dates[dates.length - 1]).toBe(offsetDate(DATE_STRIP_DAYS - 1))
    expect(strip).toHaveTextContent('Next 30 days')
  })

  it('tones each highlighted day by the status of the request covering it', async () => {
    stubApi({
      team: [
        teamRequest({
          id: 50,
          start_date: offsetDate(2),
          end_date: offsetDate(3),
          status: 'Approved',
        }),
        teamRequest({
          id: 51,
          start_date: offsetDate(10),
          end_date: offsetDate(10),
          status: 'Rejected',
        }),
      ],
    })
    renderRequests('Manager')

    const strip = await screen.findByTestId('request-date-strip')
    const day = (date: string) =>
      within(strip)
        .getAllByTestId('date-strip-day')
        .find((element) => element.getAttribute('data-date') === date)

    expect(day(offsetDate(2))).toHaveAttribute('data-status', 'Approved')
    expect(day(offsetDate(3))).toHaveAttribute('data-status', 'Approved')
    expect(day(offsetDate(10))).toHaveAttribute('data-status', 'Rejected')
    expect(day(offsetDate(6))).not.toHaveAttribute('data-highlighted')
  })

  it('clips a request that starts before the window to the days inside it', async () => {
    stubApi({
      team: [
        teamRequest({
          start_date: offsetDate(-5),
          end_date: offsetDate(1),
          status: 'Pending',
        }),
      ],
    })
    renderRequests('Manager')

    const strip = await screen.findByTestId('request-date-strip')
    const highlighted = within(strip)
      .getAllByTestId('date-strip-day')
      .filter((day) => day.getAttribute('data-highlighted') === 'true')
      .map((day) => day.getAttribute('data-date'))

    expect(highlighted).toEqual([offsetDate(0), offsetDate(1)])
  })

  it('drops the caption when nothing falls in the next 30 days', async () => {
    stubApi({
      team: [
        teamRequest({
          start_date: offsetDate(200),
          end_date: offsetDate(201),
          status: 'Pending',
        }),
      ],
    })
    renderRequests('Manager')

    await screen.findByTestId('request-date-strip')
    expect(screen.queryByText('Requests highlighted')).not.toBeInTheDocument()
  })
})

describe('the scope toggle', () => {
  it('marks exactly one segment as pressed and moves it on selection', async () => {
    stubApi({ own: [ownRequest()], team: [teamRequest()] })
    renderRequests('Manager')

    const toggle = await screen.findByTestId('scope-filter')
    const pressed = () =>
      within(toggle)
        .getAllByRole('button')
        .filter((button) => button.getAttribute('aria-pressed') === 'true')
        .map((button) => button.textContent)

    expect(pressed()).toEqual(['All'])

    fireEvent.click(within(toggle).getByRole('button', { name: 'My requests' }))

    expect(pressed()).toEqual(['My requests'])
  })
})

describe('filtering', () => {
  it('narrows the table by status', async () => {
    stubApi({
      own: [
        ownRequest({ id: 1, leave_type: 'Vacation', status: 'Pending' }),
        ownRequest({ id: 2, leave_type: 'Sick', status: 'Approved' }),
      ],
    })
    renderRequests('Employee')

    await screen.findByTestId('data-table')
    expect(screen.getByText('Sick')).toBeInTheDocument()

    fireEvent.click(
      within(screen.getByTestId('status-filter')).getByRole('button', {
        name: 'Pending',
      })
    )

    expect(screen.queryByText('Sick')).not.toBeInTheDocument()
    expect(screen.getByText('Vacation')).toBeInTheDocument()
  })

  it('offers the department filter to an Admin only', async () => {
    stubApi({
      team: [teamRequest()],
      departments: [{ id: 1, name: 'Engineering' }],
    })
    renderRequests('Admin')

    expect(await screen.findByText('David Jones')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by department')).toBeInTheDocument()
  })

  it('withholds the department filter from a Manager', async () => {
    const fetchMock = stubApi({
      team: [teamRequest()],
      departments: [{ id: 1, name: 'Engineering' }],
    })
    renderRequests('Manager')

    expect(await screen.findByText('David Jones')).toBeInTheDocument()
    expect(screen.queryByLabelText('Filter by department')).toBeNull()
    expect(screen.getByLabelText('Search by employee')).toBeInTheDocument()

    const departmentCalls = fetchMock.mock.calls.filter(([input]) =>
      String(input).includes('/api/departments')
    )
    expect(departmentCalls).toHaveLength(0)
  })

  it('keeps Clear filters in the layout so nothing shifts when it activates', async () => {
    stubApi({ own: [ownRequest()] })
    renderRequests('Employee')

    const clear = await screen.findByTestId('clear-filters')
    expect(clear).toHaveClass('invisible')

    fireEvent.click(
      within(screen.getByTestId('status-filter')).getByRole('button', {
        name: 'Pending',
      })
    )

    expect(screen.getByTestId('clear-filters')).not.toHaveClass('invisible')
  })

  it('filters the team queue by employee name', async () => {
    stubApi({
      own: [],
      team: [
        teamRequest({ id: 50, employee_name: 'David Jones' }),
        teamRequest({ id: 51, employee_name: 'Eve Knowles' }),
      ],
    })
    renderRequests('Manager')

    await screen.findByText('David Jones')

    fireEvent.change(screen.getByLabelText('Search by employee'), {
      target: { value: 'eve' },
    })

    expect(screen.queryByText('David Jones')).not.toBeInTheDocument()
    expect(screen.getByText('Eve Knowles')).toBeInTheDocument()
  })
})
