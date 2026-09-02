import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest'
import { setStoredToken } from '@/api/token'
import { AuthProvider } from '@/features/auth/auth'
import type { PublicHoliday } from '@/features/calendar/publicHolidays'
import type { Role } from '@/lib/routeAccess'
import { routes } from '@/routes'
import { makeUserJwt } from '@/test-support/jwt'
import type { LeaveRequest } from '@/types/api'

const NOW = new Date('2026-08-12T09:00:00Z')

const SUMMER: PublicHoliday = {
  id: 5,
  date: '2026-08-31',
  name: 'Summer bank holiday',
}

const APPROVED: LeaveRequest = {
  id: 40,
  employee_id: 7,
  employee_name: 'Priya Sharma',
  department_id: 1,
  department_name: 'Engineering',
  leave_type: 'Vacation',
  start_date: '2026-08-24',
  end_date: '2026-08-28',
  days_requested: 5,
  date_requested: '2026-07-01',
  status: 'Approved',
  reason: null,
  manager_note: null,
  reviewed_by_name: 'Bob Mitchell',
}

type FetchMock = Mock<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>

let fetchMock: FetchMock
let holidays: PublicHoliday[]

function respond(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    json: async () => body,
  } as unknown as Response
}

function stubApi(seed: PublicHoliday[], requests: LeaveRequest[]): void {
  holidays = [...seed]
  let nextId = 100

  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'

    if (url.includes('/api/public-holidays')) {
      const id = Number(url.split('/').pop())
      if (method === 'POST') {
        const body = JSON.parse(String(init?.body)) as Omit<PublicHoliday, 'id'>
        holidays = [...holidays, { id: (nextId += 1), ...body }]
        return respond(holidays[holidays.length - 1], 201)
      }
      if (method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as { name: string }
        holidays = holidays.map((holiday) =>
          holiday.id === id ? { ...holiday, name: body.name } : holiday
        )
        return respond(holidays)
      }
      if (method === 'DELETE') {
        holidays = holidays.filter((holiday) => holiday.id !== id)
        return respond(null, 204)
      }
      return respond(holidays)
    }
    if (url.includes('/api/leave-requests/calendar'))
      return respond({ data: [] })
    if (url.includes('/api/leave-requests/remaining')) {
      return respond({ data: { days_remaining: 18 } })
    }
    if (url.includes('/api/leave-requests')) return respond({ data: requests })
    return respond({ data: [] })
  })
  vi.stubGlobal('fetch', fetchMock)
}

async function renderCalendar(
  role: Role,
  seed: PublicHoliday[] = [],
  requests: LeaveRequest[] = []
) {
  stubApi(seed, requests)
  setStoredToken(makeUserJwt({ id: 1, email: 'alice@company.com', role }))
  render(
    <AuthProvider>
      <RouterProvider
        router={createMemoryRouter(routes, {
          initialEntries: ['/team-calendar'],
        })}
      />
    </AuthProvider>
  )
  await screen.findByTestId('calendar-month')
}

function control(id: string): HTMLElement {
  const element = document.getElementById(id)
  if (!element) throw new Error(`No control with id "${id}"`)
  return element
}

function calendarDay(date: string): HTMLElement {
  const cell = document.querySelector<HTMLElement>(
    `[data-testid="calendar-day"][data-date="${date}"]`
  )
  if (!cell) throw new Error(`No calendar cell for ${date}`)
  return cell
}

async function openBooking(date: string): Promise<void> {
  fireEvent.click(await waitFor(() => calendarDay(date)))
  fireEvent.click(calendarDay(date))
  await screen.findByTestId('book-time-off-form')
}

function pickerDay(pickerId: string, date: string): HTMLElement {
  if (!screen.queryByTestId(`${pickerId}-calendar`)) {
    fireEvent.click(control(pickerId))
  }
  const cell = screen
    .getByTestId(`${pickerId}-calendar`)
    .querySelector<HTMLElement>(`[data-date="${date}"]`)
  if (!cell) throw new Error(`No ${date} cell in the ${pickerId} calendar`)
  return cell
}

function leaveTypeOptions(): (string | null)[] {
  return within(control('leave-type'))
    .getAllByRole('option')
    .map((option) => option.textContent)
}

function bodiesFor(method: string): Record<string, unknown>[] {
  return fetchMock.mock.calls
    .filter(
      ([input, init]) =>
        init?.method === method &&
        String(input).includes('/api/public-holidays')
    )
    .map(([, init]) => JSON.parse(String(init?.body)))
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

describe('adding a public holiday from the calendar', () => {
  it('is offered to an Admin', async () => {
    await renderCalendar('Admin')
    await openBooking('2026-08-20')

    expect(leaveTypeOptions()).toContain('Public holiday')
  })

  it('is hidden from a Manager', async () => {
    await renderCalendar('Manager')
    await openBooking('2026-08-20')

    expect(leaveTypeOptions()).not.toContain('Public holiday')
  })

  it('submits the date as YYYY-MM-DD and marks it on the calendar', async () => {
    await renderCalendar('Admin')
    await openBooking('2026-08-20')

    fireEvent.change(control('leave-type'), {
      target: { value: 'Public holiday' },
    })
    fireEvent.change(screen.getByLabelText('Holiday name'), {
      target: { value: 'Summer bank holiday' },
    })
    fireEvent.submit(screen.getByTestId('book-time-off-form'))

    await waitFor(() => expect(bodiesFor('POST')).toHaveLength(1))
    expect(bodiesFor('POST')[0]).toEqual({
      name: 'Summer bank holiday',
      date: '2026-08-20',
    })
    expect(await screen.findByText('Summer bank holiday')).toBeInTheDocument()
  })

  it('warns when the date falls inside an approved request, naming it', async () => {
    await renderCalendar('Admin', [], [APPROVED])
    await openBooking('2026-08-26')

    fireEvent.change(control('leave-type'), {
      target: { value: 'Public holiday' },
    })

    const form = screen.getByTestId('book-time-off-form')
    expect(await within(form).findByRole('status')).toHaveTextContent(
      '26 Aug 2026 falls inside 1 approved request: Priya Sharma (24 Aug 2026 – 28 Aug 2026)'
    )
  })
})

describe('an existing public holiday', () => {
  it('cannot be picked as a leave date, and is left out of the day count', async () => {
    await renderCalendar('Manager', [SUMMER])
    await openBooking('2026-08-25')

    fireEvent.change(control('leave-type'), { target: { value: 'Vacation' } })
    expect(pickerDay('start-date', SUMMER.date)).toBeDisabled()

    fireEvent.click(pickerDay('start-date', '2026-08-30'))
    fireEvent.click(pickerDay('end-date', '2026-09-01'))

    expect(screen.getByTestId('booking-summary')).toHaveTextContent('2 days')
    expect(screen.getByTestId('booking-holidays')).toHaveTextContent(
      'Summer bank holiday on 31 Aug 2026'
    )
  })

  it('opens for an Admin to rename through PATCH', async () => {
    await renderCalendar('Admin', [SUMMER])
    fireEvent.click(await waitFor(() => calendarDay(SUMMER.date)))
    await screen.findByTestId('public-holiday-form')

    fireEvent.change(screen.getByLabelText('Holiday name'), {
      target: { value: 'August bank holiday' },
    })
    fireEvent.submit(screen.getByTestId('public-holiday-form'))

    await waitFor(() => expect(bodiesFor('PATCH')).toHaveLength(1))
    expect(bodiesFor('PATCH')[0]).toEqual({
      name: 'August bank holiday',
      date: SUMMER.date,
    })
  })

  it('is deleted only after confirming, and frees the date again', async () => {
    await renderCalendar('Admin', [SUMMER])
    fireEvent.click(await waitFor(() => calendarDay(SUMMER.date)))
    await screen.findByTestId('public-holiday-form')

    fireEvent.click(
      screen.getByRole('button', { name: `Delete ${SUMMER.name}` })
    )
    expect(holidays).toHaveLength(1)

    fireEvent.click(
      within(screen.getByTestId('modal')).getByRole('button', {
        name: `Delete ${SUMMER.name}`,
      })
    )

    await waitFor(() => expect(holidays).toHaveLength(0))
    await waitFor(() =>
      expect(screen.queryByText(SUMMER.name)).not.toBeInTheDocument()
    )
  })

  it('starts a booking selection for a Manager instead of opening', async () => {
    await renderCalendar('Manager', [SUMMER])
    fireEvent.click(await waitFor(() => calendarDay(SUMMER.date)))

    expect(screen.queryByTestId('public-holiday-form')).not.toBeInTheDocument()
    expect(screen.getByTestId('selection-status')).toHaveTextContent(
      'Choose an end date'
    )
  })
})
