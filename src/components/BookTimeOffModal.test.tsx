import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BookingConfirmationState } from '@/components/BookingConfirmation'
import BookTimeOffModal from '@/components/BookTimeOffModal'
import { setStoredToken } from '@/lib/api'
import { clearApiCache } from '@/lib/apiCache'
import { AuthProvider } from '@/lib/auth'
import { REQUESTS_PATH, type Role } from '@/lib/routeAccess'
import { makeUserJwt } from '@/test/jwt'
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

let fetchMock: ReturnType<typeof vi.fn>

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
    .filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')
    .map(([, init]) => init as RequestInit)
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
  it('offers exactly Vacation, Sick and Personal', async () => {
    stubApi()
    renderModal()
    await loaded()

    const options = within(control('leave-type'))
      .getAllByRole('option')
      .map((option) => option.textContent)

    expect(options).toEqual([
      'Select leave type',
      'Vacation',
      'Sick',
      'Personal',
    ])
  })

  it('does not offer the retired Business Trip and Conference types', async () => {
    stubApi()
    renderModal()
    await loaded()

    expect(screen.queryByRole('option', { name: 'Business Trip' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Conference' })).toBeNull()
  })

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
  it('serialises the dates as YYYY-MM-DD', async () => {
    stubApi()
    renderModal()
    await loaded()

    selectLeaveType('Vacation')
    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-21')
    submit()

    await waitFor(() => expect(createCalls()).toHaveLength(1))
    const body = createdBody()
    expect(body.start_date).toBe('2026-08-10')
    expect(body.end_date).toBe('2026-08-21')
    expect(body.leave_type).toBe('Vacation')
  })

  it('attaches an optional reason', async () => {
    stubApi()
    renderModal()
    await loaded()

    selectLeaveType('Personal')
    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-10')
    fireEvent.change(control('reason'), {
      target: { value: 'Family holiday plans' },
    })
    submit()

    await waitFor(() => expect(createCalls()).toHaveLength(1))
    expect(createdBody().reason).toBe('Family holiday plans')
  })

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
  it('counts Friday to Monday as four days, labelled days', async () => {
    stubApi()
    renderModal()
    await loaded()

    pickDate('start-date', '2026-08-14')
    pickDate('end-date', '2026-08-17')

    const summary = await screen.findByTestId('booking-summary')
    expect(summary).toHaveTextContent('4 days')
    expect(summary).not.toHaveTextContent('working days')
  })

  it('counts a single day as one day', async () => {
    stubApi()
    renderModal()
    await loaded()

    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-10')

    expect(await screen.findByTestId('booking-summary')).toHaveTextContent(
      '1 day'
    )
  })

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

describe('the date range', () => {
  it('blocks an end date before the start date instead of sending it', async () => {
    stubApi()
    renderModal()
    await loaded()

    selectLeaveType('Vacation')
    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-14')
    pickDate('start-date', '2026-08-20')
    submit()

    expect(
      await screen.findByText('End date must be on or after the start date')
    ).toBeInTheDocument()
    expect(createCalls()).toHaveLength(0)
  })

  it('disables dates before the start date in the end date picker', async () => {
    stubApi()
    renderModal()
    await loaded()

    pickDate('start-date', '2026-08-20')
    fireEvent.click(control('end-date'))

    expect(dayButton('end-date', '2026-08-19')).toBeDisabled()
    expect(dayButton('end-date', '2026-08-20')).toBeEnabled()
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

  it('reads the holiday dates from the public holidays endpoint', async () => {
    stubApi({
      holidays: [{ id: 2, date: '2026-08-11', name: 'Founders Day' }],
    })
    renderModal()
    await loaded()

    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes('/api/public-holidays')
      )
    ).toBe(true)

    fireEvent.click(control('start-date'))
    expect(dayButton('start-date', '2026-08-11')).toBeDisabled()
    expect(dayButton('start-date', '2026-08-26')).toBeEnabled()
  })
})

describe('server refusals', () => {
  it('explains a 409 overlap as a clash with an existing request', async () => {
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

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/clash/)
    expect(alert).toHaveTextContent(/overlap/)
    expect(alert).not.toHaveTextContent(/remaining/)
  })

  it('shows the balance figure when a 400 says the request exceeds it', async () => {
    stubApi({
      balance: { annual_allowance: 25, days_used: 22, days_remaining: 3 },
      createStatus: 400,
      createError: 'Days requested exceed remaining balance',
    })
    renderModal()
    await loaded()

    selectLeaveType('Vacation')
    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-14')
    submit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('3 days remaining')
    expect(alert).toHaveTextContent('5 days')
  })

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

  it('keeps the modal open so the dates can be corrected', async () => {
    stubApi({
      createStatus: 409,
      createError: 'Date range of request overlaps with existing request',
    })
    const { onClose } = renderModal()
    await loaded()

    selectLeaveType('Vacation')
    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-14')
    submit()

    await screen.findByRole('alert')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('book-time-off-form')).toBeInTheDocument()
  })
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

  it('navigates only after the server responds, never optimistically', async () => {
    let release: (value: unknown) => void = () => {}
    const pending = new Promise((resolve) => {
      release = resolve
    })

    stubApi({ gateCreateOn: pending })

    renderModal()
    await loaded()

    selectLeaveType('Vacation')
    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-14')
    submit()

    await waitFor(() => expect(createCalls()).toHaveLength(1))
    expect(location()).toHaveAttribute('data-pathname', '/')

    release(null)

    await waitFor(() =>
      expect(location()).toHaveAttribute('data-pathname', REQUESTS_PATH)
    )
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

describe('booking as a Manager', () => {
  function formShape(): string[] {
    return Array.from(
      screen
        .getByTestId('book-time-off-form')
        .querySelectorAll('label, input, select, textarea, button')
    ).map((element) => {
      const tag = element.tagName.toLowerCase()
      const id = element.id ? `#${element.id}` : ''
      const text = element.textContent?.trim() ?? ''
      return `${tag}${id}${tag === 'button' || tag === 'label' ? ` "${text}"` : ''}`
    })
  }

  it('renders the same booking form for an Employee and a Manager', async () => {
    stubApi()
    const { unmount } = renderModal(vi.fn(), 'Employee')
    await loaded()
    const asEmployee = formShape()

    unmount()
    localStorage.clear()
    clearApiCache()

    stubApi()
    renderModal(vi.fn(), 'Manager')
    await loaded()

    expect(formShape()).toEqual(asEmployee)
    expect(asEmployee.length).toBeGreaterThan(0)
  })

  it('books against the token holder, with no employee_id in the payload', async () => {
    stubApi()
    renderModal(vi.fn(), 'Manager')
    await loaded()

    selectLeaveType('Vacation')
    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-14')
    submit()

    await waitFor(() => expect(createCalls()).toHaveLength(1))
    expect(createdBody()).not.toHaveProperty('employee_id')
  })

  it('sends a Manager to the same My requests destination', async () => {
    stubApi()
    renderModal(vi.fn(), 'Manager')
    await loaded()

    selectLeaveType('Sick')
    pickDate('start-date', '2026-08-10')
    pickDate('end-date', '2026-08-10')
    submit()

    await waitFor(() =>
      expect(location()).toHaveAttribute('data-pathname', REQUESTS_PATH)
    )
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

  it('sizes every control in the dialog for touch', async () => {
    stubApi()
    renderModal()
    await loaded()
    fireEvent.click(control('start-date'))

    const targets = Array.from(
      screen
        .getByTestId('modal')
        .querySelectorAll('a, button, input, select, textarea')
    )
    const undersized = targets
      .filter((element) => !element.classList.contains('touch-target'))
      .map((element) => element.tagName.toLowerCase())

    expect(undersized).toEqual([])
  })
})
