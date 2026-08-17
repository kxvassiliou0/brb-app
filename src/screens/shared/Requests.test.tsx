import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setStoredToken } from '@/lib/api'
import { AuthProvider } from '@/lib/auth'
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
  departments?: { id: number; name: string }[]
}

function jsonOk(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data }),
  } as unknown as Response
}

function stubApi({ own = [], team = [], departments = [] }: StubOptions = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/remaining/')) return jsonOk(BALANCE)
    if (url.includes('/status/')) return jsonOk(own)
    if (url.includes('/api/departments')) return jsonOk(departments)
    return jsonOk(team)
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
