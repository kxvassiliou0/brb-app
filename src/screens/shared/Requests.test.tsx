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
import { DATE_STRIP_DAYS } from '@/lib/requestFilters'
import { REQUESTS_PATH, type Role } from '@/lib/routeAccess'
import { routes } from '@/routes'
import { makeUserJwt } from '@/test/jwt'
import type {
  LeaveRequest,
  LeaveStatus,
  OwnLeaveRequest,
  RemainingLeave,
} from '@/types/api'

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
    reviewed_by_name: null,
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
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (init?.method === 'PATCH') return jsonOk({})
      if (url.includes('/remaining/')) return jsonOk(BALANCE)
      if (url.includes('/status/')) return jsonOk(own)
      if (url.includes('/api/departments')) return jsonOk(departments)
      const queue = url.match(/\/pending\/manager\/(\d+)/)
      if (queue) return jsonOk(queues ? (queues[Number(queue[1])] ?? []) : team)
      return jsonOk(allRequests)
    }
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function bodyRows(): HTMLElement[] {
  return within(screen.getByTestId('data-table')).getAllByRole('row').slice(1)
}

function columnValues(header: string): string[] {
  const headers = within(screen.getByTestId('data-table')).getAllByRole(
    'columnheader'
  )
  const index = headers.findIndex((cell) => cell.textContent === header)
  if (index === -1) throw new Error(`No "${header}" column`)
  return bodyRows().map(
    (row) => within(row).getAllByRole('cell')[index]!.textContent ?? ''
  )
}

function statusColumn(): string[] {
  return columnValues('Status')
}

function clickStatusTab(name: string): void {
  fireEvent.click(
    within(screen.getByTestId('status-filter')).getByRole('button', { name })
  )
}

function detailRow(label: string): string {
  const modal = screen.queryByTestId('modal')
  if (!modal) return ''
  const term = within(modal).queryByText(label)
  return term?.nextElementSibling?.textContent ?? ''
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

describe('the list of my requests', () => {
  it('keeps the order the API returned, most recent request first', async () => {
    stubApi({
      own: [
        ownRequest({
          id: 3,
          date_requested: '2026-07-30',
          start_date: '2026-08-03',
          end_date: '2026-08-04',
        }),
        ownRequest({
          id: 2,
          date_requested: '2026-07-10',
          start_date: '2026-12-21',
          end_date: '2026-12-22',
        }),
        ownRequest({
          id: 1,
          date_requested: '2026-06-01',
          start_date: '2026-09-14',
          end_date: '2026-09-15',
        }),
      ],
    })
    renderRequests('Employee')

    await screen.findByTestId('data-table')
    const requested = bodyRows().map(
      (row) => within(row).getAllByRole('cell')[3]!.textContent
    )

    expect(requested).toEqual(['30 Jul 2026', '10 Jul 2026', '1 Jun 2026'])
  })

  it('describes every row by type, dates, days, date requested and status', async () => {
    stubApi({
      own: [
        ownRequest({
          leave_type: 'Sick',
          start_date: '2026-08-10',
          end_date: '2026-08-14',
          days_requested: 5,
          date_requested: '2026-07-02',
          status: 'Approved',
        }),
      ],
    })
    renderRequests('Employee')

    await screen.findByTestId('data-table')
    const cells = within(bodyRows()[0]!)
      .getAllByRole('cell')
      .map((cell) => cell.textContent)

    expect(cells).toEqual([
      'Sick',
      '10 Aug 2026 – 14 Aug 2026',
      '5',
      '2 Jul 2026',
      'Approved',
      '',
    ])
  })

  it('names the status in text, so colour is never the only signal', async () => {
    const statuses: LeaveStatus[] = [
      'Pending',
      'Approved',
      'Rejected',
      'Cancelled',
    ]
    stubApi({
      own: statuses.map((status, index) =>
        ownRequest({ id: index + 1, status })
      ),
    })
    renderRequests('Employee')

    await screen.findByTestId('data-table')
    for (const element of Array.from(document.querySelectorAll('[class]'))) {
      element.removeAttribute('class')
    }

    expect(statusColumn()).toEqual(statuses)
  })

  it('associates every column header with its column', async () => {
    stubApi({ own: [ownRequest()] })
    renderRequests('Employee')

    const table = await screen.findByTestId('data-table')
    const headers = within(table).getAllByRole('columnheader')

    expect(headers.map((header) => header.textContent)).toEqual([
      'Type',
      'Dates',
      'Days',
      'Date requested',
      'Status',
      'Actions',
    ])
    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col')
    }
    expect(within(bodyRows()[0]!).getAllByRole('cell')).toHaveLength(
      headers.length
    )
  })

  it('opens the full request from the leftmost column', async () => {
    stubApi({
      own: [
        ownRequest({
          id: 1,
          leave_type: 'Vacation',
          start_date: '2026-08-10',
          end_date: '2026-08-14',
          days_requested: 5,
          date_requested: '2026-07-02',
          reason: 'Autumn trip',
        }),
      ],
    })
    renderRequests('Employee')

    await screen.findByTestId('data-table')
    fireEvent.click(screen.getByRole('button', { name: 'Vacation' }))

    const modal = within(screen.getByTestId('modal'))
    expect(modal.getByRole('heading', { name: 'Vacation leave' })).toBeVisible()
    expect(detailRow('Dates')).toBe('10 Aug 2026 – 14 Aug 2026')
    expect(detailRow('Duration')).toBe('5 days')
    expect(detailRow('Date requested')).toBe('2 Jul 2026')
    expect(detailRow('Status')).toBe('Pending')
    expect(modal.getByText('Autumn trip')).toBeInTheDocument()
  })

  it("explains the manager's reasoning at the foot of a rejected request", async () => {
    stubApi({
      own: [
        ownRequest({
          id: 1,
          leave_type: 'Personal',
          status: 'Rejected',
          manager_note: 'Two others in Engineering are already away that week.',
        }),
        ownRequest({ id: 2, leave_type: 'Sick', status: 'Pending' }),
      ],
    })
    renderRequests('Employee')

    await screen.findByTestId('data-table')
    expect(screen.queryByTestId('manager-note')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Personal' }))
    const note = screen.getByTestId('manager-note')

    expect(note).toHaveTextContent(
      'Two others in Engineering are already away that week.'
    )
    const blocks = Array.from(screen.getByTestId('modal').children)
    expect(blocks.indexOf(note)).toBe(blocks.length - 2)
    expect(detailRow('Status')).toBe('Rejected')
  })

  it('leaves the manager note off a request nobody rejected', async () => {
    stubApi({
      own: [
        ownRequest({
          id: 1,
          leave_type: 'Sick',
          status: 'Approved',
          manager_note: 'Approved on the phone.',
        }),
      ],
    })
    renderRequests('Employee')

    await screen.findByTestId('data-table')
    fireEvent.click(screen.getByRole('button', { name: 'Sick' }))

    expect(screen.getByTestId('modal')).toBeInTheDocument()
    expect(screen.queryByTestId('manager-note')).not.toBeInTheDocument()
  })

  it('closes the request details again', async () => {
    stubApi({ own: [ownRequest({ id: 1, leave_type: 'Vacation' })] })
    renderRequests('Employee')

    await screen.findByTestId('data-table')
    fireEvent.click(screen.getByRole('button', { name: 'Vacation' }))
    fireEvent.click(
      within(screen.getByTestId('modal')).getByRole('button', { name: 'Close' })
    )

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('invites a user with no requests to book their first trip', async () => {
    stubApi({ own: [] })
    renderRequests('Employee')

    expect(
      await screen.findByText(
        "You haven't submitted any time-off requests. Book your first trip to get started!"
      )
    ).toBeInTheDocument()
    expect(screen.getByTestId('table-empty-state')).toBeInTheDocument()
  })
})

describe('the status tabs', () => {
  const MIXED: OwnLeaveRequest[] = [
    ownRequest({ id: 1, status: 'Pending' }),
    ownRequest({ id: 2, status: 'Pending' }),
    ownRequest({ id: 3, status: 'Approved' }),
    ownRequest({ id: 4, status: 'Rejected' }),
    ownRequest({ id: 5, status: 'Cancelled' }),
  ]

  it('covers All plus every status a leave request can hold', async () => {
    stubApi({ own: MIXED })
    renderRequests('Employee')

    const tabs = within(
      await screen.findByTestId('status-filter')
    ).getAllByRole('button')

    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'All',
      'Pending',
      'Approved',
      'Rejected',
      'Cancelled',
    ])
  })

  it.each([
    ['Pending', ['Pending', 'Pending']],
    ['Approved', ['Approved']],
    ['Rejected', ['Rejected']],
    ['Cancelled', ['Cancelled']],
  ])('shows only %s requests under the %s tab', async (tab, expected) => {
    stubApi({ own: MIXED })
    renderRequests('Employee')

    await screen.findByTestId('data-table')
    clickStatusTab(tab)

    expect(statusColumn()).toEqual(expected)
  })

  it('brings every request back under All', async () => {
    stubApi({ own: MIXED })
    renderRequests('Employee')

    await screen.findByTestId('data-table')
    clickStatusTab('Cancelled')
    expect(statusColumn()).toEqual(['Cancelled'])

    clickStatusTab('All')

    expect(statusColumn()).toEqual(MIXED.map((request) => request.status))
  })

  it('tells a user with no cancelled requests that none match', async () => {
    stubApi({ own: [ownRequest({ id: 1, status: 'Approved' })] })
    renderRequests('Employee')

    await screen.findByTestId('data-table')
    clickStatusTab('Cancelled')

    expect(
      screen.getByText('No requests match these filters.')
    ).toBeInTheDocument()
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

  it('reflects the approved days in the balance the next review shows', async () => {
    const before: RemainingLeave = {
      annual_allowance: 25,
      days_used: 7,
      days_remaining: 18,
    }
    const after: RemainingLeave = {
      annual_allowance: 25,
      days_used: 12,
      days_remaining: 13,
    }
    const queue = [
      teamRequest({ id: 50, days_requested: 5 }),
      teamRequest({
        id: 51,
        start_date: '2026-09-10',
        end_date: '2026-09-12',
        days_requested: 3,
      }),
    ]
    let approved = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (init?.method === 'PATCH') {
          approved = true
          return jsonOk({})
        }
        if (url.includes('/remaining/'))
          return jsonOk(approved ? after : before)
        if (url.includes('/pending/manager/'))
          return jsonOk(approved ? queue.slice(1) : queue)
        return jsonOk([])
      })
    )
    renderRequests('Manager')

    const names = await screen.findAllByRole('button', { name: 'David Jones' })
    fireEvent.click(names[0]!)
    await waitFor(() => expect(detailRow('Days remaining')).toBe('18 days'))

    fireEvent.click(
      within(screen.getByTestId('modal')).getByRole('button', {
        name: 'Approve',
      })
    )
    await waitFor(() =>
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    )

    fireEvent.click(await screen.findByRole('button', { name: 'David Jones' }))
    await waitFor(() => expect(detailRow('Days remaining')).toBe('13 days'))
    expect(detailRow('Days used')).toBe('12 days')
    expect(detailRow('Entitlement')).toBe('25 days')
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

describe("the admin's company-wide view", () => {
  const COMPANY_WIDE: LeaveRequest[] = [
    teamRequest({
      id: 50,
      employee_id: 4,
      employee_name: 'David Jones',
      department_id: 1,
      department_name: 'Engineering',
      status: 'Pending',
    }),
    teamRequest({
      id: 51,
      employee_id: 6,
      employee_name: 'Frank Harrison',
      department_id: 3,
      department_name: 'Finance',
      status: 'Approved',
      reviewed_by_name: 'Carol Reeves',
    }),
    teamRequest({
      id: 52,
      employee_id: 7,
      employee_name: 'Grace Williams',
      department_id: 4,
      department_name: 'Marketing',
      status: 'Rejected',
      reviewed_by_name: 'Alice Thompson',
    }),
    teamRequest({
      id: 53,
      employee_id: 5,
      employee_name: 'Eve Knowles',
      department_id: 1,
      department_name: 'Engineering',
      status: 'Cancelled',
    }),
  ]

  it('lists requests from every department, not only the admin’s own', async () => {
    stubApi({ own: [ownRequest()], allRequests: COMPANY_WIDE })
    renderRequests('Admin')

    expect(await screen.findByText('David Jones')).toBeInTheDocument()
    expect(screen.getByText('Frank Harrison')).toBeInTheDocument()
    expect(screen.getByText('Grace Williams')).toBeInTheDocument()
    expect(screen.getByText('Eve Knowles')).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(COMPANY_WIDE.length)
  })

  it('draws the list from the company-wide endpoint, not a manager queue', async () => {
    const fetchMock = stubApi({ allRequests: COMPANY_WIDE })
    renderRequests('Admin')

    await screen.findByText('David Jones')
    const paths = fetchMock.mock.calls.map(([input]) => String(input))

    expect(paths.some((path) => path.endsWith('/api/leave-requests'))).toBe(
      true
    )
    expect(paths.some((path) => path.includes('/pending/manager/'))).toBe(false)
  })

  it('approves a request from an employee who does not report to the admin', async () => {
    const fetchMock = stubApi({
      allRequests: [
        teamRequest({
          id: 51,
          employee_id: 6,
          employee_name: 'Frank Harrison',
          status: 'Pending',
        }),
      ],
    })
    renderRequests('Admin')

    await screen.findByText('Frank Harrison')
    fireEvent.click(
      within(bodyRows()[0]!).getByRole('button', { name: 'Approve' })
    )

    await waitFor(() => {
      const approvals = fetchMock.mock.calls.filter(
        ([input, init]) =>
          init?.method === 'PATCH' &&
          String(input).endsWith('/api/leave-requests/approve')
      )
      expect(approvals).toHaveLength(1)
      expect(JSON.parse(String(approvals[0]![1]?.body))).toEqual({
        leave_request_id: 51,
      })
    })
  })

  it('rejects a request from an employee who does not report to the admin', async () => {
    const fetchMock = stubApi({
      allRequests: [
        teamRequest({
          id: 52,
          employee_id: 7,
          employee_name: 'Grace Williams',
          status: 'Pending',
        }),
      ],
    })
    renderRequests('Admin')

    await screen.findByText('Grace Williams')
    fireEvent.click(
      within(bodyRows()[0]!).getByRole('button', { name: 'Decline' })
    )
    fireEvent.click(
      within(screen.getByTestId('modal')).getByRole('button', {
        name: 'Decline',
      })
    )

    await waitFor(() => {
      const rejections = fetchMock.mock.calls.filter(
        ([input, init]) =>
          init?.method === 'PATCH' &&
          String(input).endsWith('/api/leave-requests/reject')
      )
      expect(rejections).toHaveLength(1)
    })
  })

  it('names the reviewer on a reviewed request', async () => {
    stubApi({ allRequests: COMPANY_WIDE })
    renderRequests('Admin')

    await screen.findByText('Frank Harrison')

    expect(columnValues('Reviewed by')).toEqual([
      '—',
      'Carol Reeves',
      'Alice Thompson',
      '—',
    ])
  })

  it('renders an explicit dash when nobody has reviewed the request', async () => {
    stubApi({
      allRequests: [
        teamRequest({ id: 50, status: 'Pending', reviewed_by_name: null }),
      ],
    })
    renderRequests('Admin')

    await screen.findByText('David Jones')
    const reviewer = columnValues('Reviewed by')

    expect(reviewer).toEqual(['—'])
    expect(reviewer[0]).not.toBe('')
  })

  it.each([
    ['Pending', ['David Jones']],
    ['Approved', ['Frank Harrison']],
    ['Rejected', ['Grace Williams']],
    ['Cancelled', ['Eve Knowles']],
  ])('shows only %s requests under the %s tab', async (tab, expected) => {
    stubApi({ allRequests: COMPANY_WIDE })
    renderRequests('Admin')

    await screen.findByText('David Jones')
    clickStatusTab(tab)

    expect(columnValues('Employee')).toEqual(expected)
    expect(columnValues('Status')).toEqual([tab])
  })

  it('brings every status back under All', async () => {
    stubApi({ allRequests: COMPANY_WIDE })
    renderRequests('Admin')

    await screen.findByText('David Jones')
    clickStatusTab('Rejected')
    expect(bodyRows()).toHaveLength(1)

    clickStatusTab('All')

    expect(columnValues('Status')).toEqual([
      'Pending',
      'Approved',
      'Rejected',
      'Cancelled',
    ])
  })

  it('shows a Manager their own team only, never the company-wide list', async () => {
    stubApi({
      queues: {
        [USER_ID]: [teamRequest({ id: 50, employee_name: 'David Jones' })],
      },
      allRequests: COMPANY_WIDE,
    })
    renderRequests('Manager')

    expect(await screen.findByText('David Jones')).toBeInTheDocument()
    expect(screen.queryByText('Frank Harrison')).not.toBeInTheDocument()
    expect(screen.queryByText('Grace Williams')).not.toBeInTheDocument()
    expect(screen.queryByText('Eve Knowles')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: 'Reviewed by' })
    ).not.toBeInTheDocument()
  })
})

describe('declining a request', () => {
  function patchCalls(fetchMock: ReturnType<typeof stubApi>) {
    return fetchMock.mock.calls.filter(
      ([input, init]) =>
        init?.method === 'PATCH' &&
        String(input).endsWith('/api/leave-requests/reject')
    )
  }

  function clickRowDecline(): void {
    fireEvent.click(
      within(bodyRows()[0]!).getByRole('button', { name: 'Decline' })
    )
  }

  function confirmDecline(): void {
    fireEvent.click(
      within(screen.getByTestId('modal')).getByRole('button', {
        name: 'Decline',
      })
    )
  }

  it('asks for confirmation instead of declining straight away', async () => {
    const fetchMock = stubApi({ team: [teamRequest()] })
    renderRequests('Manager')

    await screen.findByText('David Jones')
    clickRowDecline()

    expect(screen.getByTestId('decline-confirmation')).toHaveTextContent(
      'Decline this request?'
    )
    expect(patchCalls(fetchMock)).toHaveLength(0)
  })

  it('names the employee and the dates being turned down', async () => {
    stubApi({
      team: [
        teamRequest({
          employee_name: 'David Jones',
          start_date: '2026-08-10',
          end_date: '2026-08-14',
          days_requested: 5,
        }),
      ],
    })
    renderRequests('Manager')

    await screen.findByText('David Jones')
    clickRowDecline()

    const confirmation = screen.getByTestId('decline-confirmation')
    expect(confirmation).toHaveTextContent('David Jones')
    expect(confirmation).toHaveTextContent('10 Aug 2026 – 14 Aug 2026')
    expect(confirmation).toHaveTextContent('5 days')
  })

  it('leaves the request pending when the manager backs out', async () => {
    const fetchMock = stubApi({ team: [teamRequest()] })
    renderRequests('Manager')

    await screen.findByText('David Jones')
    clickRowDecline()
    fireEvent.click(
      within(screen.getByTestId('modal')).getByRole('button', {
        name: 'Keep pending',
      })
    )

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    expect(patchCalls(fetchMock)).toHaveLength(0)
  })

  it('sends the note the reviewer typed with the rejection', async () => {
    const fetchMock = stubApi({ team: [teamRequest({ id: 50 })] })
    renderRequests('Manager')

    await screen.findByText('David Jones')
    clickRowDecline()
    fireEvent.change(screen.getByLabelText('Manager note (optional)'), {
      target: { value: 'Two others in Engineering are already away.' },
    })
    confirmDecline()

    await waitFor(() => expect(patchCalls(fetchMock)).toHaveLength(1))
    expect(JSON.parse(String(patchCalls(fetchMock)[0]![1]?.body))).toEqual({
      leave_request_id: 50,
      reason: 'Two others in Engineering are already away.',
    })
  })

  it('declines without a note when the reviewer leaves it blank', async () => {
    const fetchMock = stubApi({ team: [teamRequest({ id: 50 })] })
    renderRequests('Manager')

    await screen.findByText('David Jones')
    clickRowDecline()
    confirmDecline()

    await waitFor(() => expect(patchCalls(fetchMock)).toHaveLength(1))
    expect(JSON.parse(String(patchCalls(fetchMock)[0]![1]?.body))).toEqual({
      leave_request_id: 50,
    })
  })

  it('closes the confirmation once the request is declined', async () => {
    stubApi({ team: [teamRequest()] })
    renderRequests('Manager')

    await screen.findByText('David Jones')
    clickRowDecline()
    confirmDecline()

    await waitFor(() =>
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    )
  })

  it.each([
    ['Manager', 'Manager note (optional)'],
    ['Admin', 'Admin note (optional)'],
  ] as [Role, string][])('labels the note for a %s', async (role, label) => {
    stubApi({ team: [teamRequest()], allRequests: [teamRequest()] })
    renderRequests(role)

    await screen.findByText('David Jones')
    clickRowDecline()

    expect(screen.getByLabelText(label)).toBeInTheDocument()
  })

  it('approves without asking for confirmation', async () => {
    const fetchMock = stubApi({ team: [teamRequest({ id: 50 })] })
    renderRequests('Manager')

    await screen.findByText('David Jones')
    fireEvent.click(
      within(bodyRows()[0]!).getByRole('button', { name: 'Approve' })
    )

    await waitFor(() => {
      const approvals = fetchMock.mock.calls.filter(
        ([input, init]) =>
          init?.method === 'PATCH' &&
          String(input).endsWith('/api/leave-requests/approve')
      )
      expect(approvals).toHaveLength(1)
    })
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })
})
