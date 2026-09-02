import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setStoredToken } from '@/api/token'
import { AuthProvider } from '@/features/auth/auth'
import { DATE_STRIP_DAYS } from '@/features/requests/requestFilters'
import { REQUESTS_PATH, type Role } from '@/lib/routeAccess'
import { routes } from '@/routes'
import { makeUserJwt } from '@/test-support/jwt'
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
    expect(blocks.indexOf(note)).toBe(blocks.length - 1)
    expect(detailRow('Status')).toBe('Rejected')
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
})

describe('filtering', () => {
  const COMPANY: LeaveRequest[] = [
    teamRequest({
      id: 60,
      employee_name: 'David Jones',
      department_id: 1,
      status: 'Pending',
    }),
    teamRequest({
      id: 61,
      employee_name: 'David Jones',
      department_id: 1,
      status: 'Approved',
    }),
    teamRequest({
      id: 62,
      employee_name: 'Davina Jones',
      department_id: 3,
      status: 'Pending',
    }),
    teamRequest({
      id: 63,
      employee_name: 'Eve Knowles',
      department_id: 1,
      status: 'Pending',
    }),
  ]

  const DEPARTMENTS = [
    { id: 1, name: 'Engineering' },
    { id: 3, name: 'Finance' },
  ]

  function searchFor(term: string): void {
    fireEvent.change(screen.getByLabelText('Search by employee'), {
      target: { value: term },
    })
  }

  function chooseDepartment(id: string): void {
    fireEvent.change(screen.getByLabelText('Filter by department'), {
      target: { value: id },
    })
  }

  function employeeColumn(): string[] {
    return columnValues('Employee')
  }

  it('offers the department filter to an Admin', async () => {
    stubApi({ team: [teamRequest()], departments: DEPARTMENTS })
    renderRequests('Admin')

    expect(await screen.findByText('David Jones')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by department')).toBeInTheDocument()
  })

  it('narrows by name, department and status together rather than one replacing another', async () => {
    stubApi({ team: COMPANY, departments: DEPARTMENTS })
    renderRequests('Admin')

    await screen.findByTestId('data-table')

    searchFor('jones')
    expect(employeeColumn()).toEqual([
      'David Jones',
      'David Jones',
      'Davina Jones',
    ])

    chooseDepartment('1')
    expect(employeeColumn()).toEqual(['David Jones', 'David Jones'])
    expect(statusColumn()).toEqual(['Pending', 'Approved'])

    clickStatusTab('Pending')
    expect(employeeColumn()).toEqual(['David Jones'])
    expect(statusColumn()).toEqual(['Pending'])
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

    expect(screen.getByTestId('modal')).toHaveTextContent(
      'Decline this request?'
    )
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
