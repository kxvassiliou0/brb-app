import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest'
import type { BookingConfirmationState } from '@/components/requests/BookingConfirmation'
import BookTimeOffModal from '@/components/requests/BookTimeOffModal'
import { setStoredToken } from '@/api/token'
import { AuthProvider } from '@/features/auth/auth'
import { REQUESTS_PATH, type Role } from '@/lib/routeAccess'
import { makeUserJwt } from '@/test-support/jwt'
import type { RemainingLeave } from '@/types/api'

const EMPLOYEE_ID = 1

const NOW = new Date('2026-08-05T09:00:00')

const BALANCE: RemainingLeave = {
  annual_allowance: 25,
  days_used: 7,
  days_remaining: 18,
}

const HOLIDAYS = [{ id: 1, date: '2026-08-26', name: 'Summer Bank Holiday' }]

export const CREATED_ID = 9

export const SERVER_CONFIRMATION = 'Leave request has been submitted for review'

interface StubOptions {
  balance?: RemainingLeave
  holidays?: { id: number; date: string; name: string }[]
  createStatus?: number
  createError?: string
  createMessage?: string
  gateCreateOn?: Promise<unknown>
}

type FetchMock = Mock<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>

let fetchMock: FetchMock

function stubApi({
  balance = BALANCE,
  holidays = HOLIDAYS,
  createStatus = 201,
  createError,
  createMessage = SERVER_CONFIRMATION,
  gateCreateOn,
}: StubOptions = {}): void {
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'POST') {
      if (gateCreateOn) await gateCreateOn
      return {
        ok: createStatus < 400,
        status: createStatus,
        json: async () =>
          createError
            ? { error: createError }
            : { data: { id: CREATED_ID }, message: createMessage },
      } as unknown as Response
    }
    if (url.includes('/api/public-holidays')) {
      return {
        ok: true,
        status: 200,
        json: async () => holidays,
      } as unknown as Response
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: balance }),
    } as unknown as Response
  })
  vi.stubGlobal('fetch', fetchMock)
}

function LocationProbe() {
  const location = useLocation()
  const state = (location.state ?? {}) as BookingConfirmationState
  return (
    <div
      data-testid="location"
      data-pathname={location.pathname}
      data-confirmation={state.bookingConfirmation ?? ''}
      data-request-id={state.bookingRequestId ?? ''}
    />
  )
}

function renderModal(onBooked = vi.fn(), role: Role = 'Employee') {
  setStoredToken(
    makeUserJwt({
      id: EMPLOYEE_ID,
      email: 'priya.sharma@company.com',
      role,
    })
  )
  const onClose = vi.fn()
  const { unmount } = render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <BookTimeOffModal onClose={onClose} onBooked={onBooked} />
        <LocationProbe />
      </AuthProvider>
    </MemoryRouter>
  )
  return { onClose, onBooked, unmount }
}

function location() {
  return screen.getByTestId('location')
}

function control(id: string): HTMLElement {
  const element = document.getElementById(id)
  if (!element) throw new Error(`No control with id "${id}"`)
  return element
}

async function loaded(): Promise<void> {
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
}

function dayButton(pickerId: string, date: string): HTMLElement {
  const calendar = screen.getByTestId(`${pickerId}-calendar`)
  const day = within(calendar)
    .getAllByTestId('calendar-day')
    .find((button) => button.getAttribute('data-date') === date)
  if (!day) throw new Error(`No ${date} cell in the ${pickerId} calendar`)
  return day
}

function pickDate(pickerId: string, date: string): void {
  fireEvent.click(control(pickerId))
  fireEvent.click(dayButton(pickerId, date))
}

function selectLeaveType(type: string): void {
  fireEvent.change(control('leave-type'), { target: { value: type } })
}

function submit(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Send request' }))
}

function createCalls(): RequestInit[] {
  return fetchMock.mock.calls
    .map(([, init]) => init)
    .filter((init): init is RequestInit => init?.method === 'POST')
}

function createdBody(): Record<string, unknown> {
  const call = createCalls()[0]
  if (!call) throw new Error('No leave request was sent')
  return JSON.parse(String(call.body))
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

describe('leave type options', () => {
  it('refuses to submit until a leave type is chosen', async () => {
    stubApi()
    renderModal()
    await loaded()

    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-14')
    submit()

    expect(
      await screen.findByText('Please select a leave type')
    ).toBeInTheDocument()
    expect(createCalls()).toHaveLength(0)
  })
})

describe('what gets sent to the API', () => {
  it('books for the signed-in employee without passing an employee_id', async () => {
    stubApi()
    renderModal()
    await loaded()

    selectLeaveType('Sick')
    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-10')
    submit()

    await waitFor(() => expect(createCalls()).toHaveLength(1))
    expect(createdBody().employee_id).toBeUndefined()
  })
})

describe('the day count and balance', () => {
  it('shows the balance left after the request before it is sent', async () => {
    stubApi()
    renderModal()
    await loaded()

    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-14')

    expect(await screen.findByTestId('booking-remaining')).toHaveTextContent(
      '13 days remaining after this request'
    )
    expect(createCalls()).toHaveLength(0)
  })
})

describe('public holidays', () => {
  it('disables public holiday dates in the picker', async () => {
    stubApi()
    renderModal()
    await loaded()

    fireEvent.click(control('start-date'))

    const holiday = dayButton('start-date', '2026-08-26')
    expect(holiday).toBeDisabled()
    expect(holiday).toHaveAccessibleName(/Summer Bank Holiday/)
    expect(dayButton('start-date', '2026-08-25')).toBeEnabled()
  })
})

describe('server refusals', () => {
  it.each([
    [
      'a 400 balance refusal',
      400,
      'Days requested exceed remaining balance',
      /remaining/,
    ],
    [
      'a 409 overlap refusal',
      409,
      'Date range of request overlaps with existing request',
      /clash/,
    ],
    [
      'a 400 invalid dates refusal',
      400,
      'Dates must be in YYYY-MM-DD format',
      /not accepted/,
    ],
  ])(
    'keeps the entered dates, type and reason after %s',
    async (_label, createStatus, createError, expected) => {
      stubApi({ createStatus, createError })
      const { onClose } = renderModal()
      await loaded()

      selectLeaveType('Personal')
      pickDate('start-date', '2026-08-10')
      pickDate('end-date', '2026-08-14')
      fireEvent.change(control('reason'), {
        target: { value: 'Family holiday plans' },
      })
      submit()

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent(expected)

      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByTestId('book-time-off-form')).toBeInTheDocument()
      expect(control('leave-type')).toHaveValue('Personal')
      expect(control('start-date')).toHaveTextContent('10 Aug 2026')
      expect(control('end-date')).toHaveTextContent('14 Aug 2026')
      expect(control('reason')).toHaveValue('Family holiday plans')
    }
  )
})

describe('a successful booking', () => {
  it('closes the modal and tells the screen to refresh', async () => {
    stubApi()
    const onBooked = vi.fn()
    const { onClose } = renderModal(onBooked)
    await loaded()

    selectLeaveType('Vacation')
    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-14')
    submit()

    await waitFor(() => expect(onBooked).toHaveBeenCalled())
    expect(onClose).toHaveBeenCalled()
  })

  it("carries the backend's confirmation wording to My requests", async () => {
    stubApi()
    renderModal()
    await loaded()

    selectLeaveType('Vacation')
    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-14')
    submit()

    await waitFor(() =>
      expect(location()).toHaveAttribute('data-pathname', REQUESTS_PATH)
    )
    expect(location()).toHaveAttribute('data-confirmation', SERVER_CONFIRMATION)
    expect(location()).toHaveAttribute('data-request-id', String(CREATED_ID))
  })

  it('does not navigate when the server refuses the request', async () => {
    stubApi({
      createStatus: 409,
      createError: 'Date range of request overlaps with existing request',
    })
    renderModal()
    await loaded()

    selectLeaveType('Vacation')
    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-14')
    submit()

    await screen.findByRole('alert')
    expect(location()).toHaveAttribute('data-pathname', '/')
    expect(location()).toHaveAttribute('data-confirmation', '')
  })
})

describe('the dialog itself', () => {
  it('is a labelled modal dialog', async () => {
    stubApi()
    renderModal()
    await loaded()

    const dialog = screen.getByTestId('modal')
    expect(dialog).toHaveAttribute('role', 'dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(
      within(dialog).getByRole('heading', { name: 'Book time off' })
    ).toBeInTheDocument()
  })

  it('closes on Escape and on Cancel', async () => {
    stubApi()
    const { onClose } = renderModal()
    await loaded()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('booking as an Admin', () => {
  const EMPLOYEES = [
    { id: EMPLOYEE_ID, firstName: 'Alice', lastName: 'Thompson' },
    { id: 4, firstName: 'David', lastName: 'Jones' },
    { id: 7, firstName: 'Grace', lastName: 'Williams' },
  ]

  function stubAdminApi(options: StubOptions = {}): void {
    stubApi(options)
    const inner = fetchMock
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/api/users')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: EMPLOYEES }),
        } as unknown as Response
      }
      return inner(input, init)
    })
    vi.stubGlobal('fetch', fetchMock)
  }

  async function adminLoaded(): Promise<void> {
    await screen.findByRole('option', { name: 'David Jones' })
  }

  function chooseEmployee(id: number): void {
    fireEvent.change(control('booking-employee'), {
      target: { value: String(id) },
    })
  }

  it('offers every employee, with the signed-in admin marked as themselves', async () => {
    stubAdminApi()
    renderModal(vi.fn(), 'Admin')
    await adminLoaded()

    const options = within(control('booking-employee'))
      .getAllByRole('option')
      .map((option) => option.textContent)

    expect(options).toEqual([
      'Alice Thompson (you)',
      'David Jones',
      'Grace Williams',
    ])
  })

  it('sends the chosen employee_id when booking on behalf of another user', async () => {
    stubAdminApi()
    renderModal(vi.fn(), 'Admin')
    await adminLoaded()

    chooseEmployee(4)
    selectLeaveType('Vacation')
    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-14')
    submit()

    await waitFor(() => expect(createCalls()).toHaveLength(1))
    expect(createdBody().employee_id).toBe(4)
  })

  it('withholds the employee picker from a Manager', async () => {
    stubApi()
    renderModal(vi.fn(), 'Manager')
    await loaded()

    expect(document.getElementById('booking-employee')).toBeNull()
  })
})
