import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setStoredToken } from '@/lib/api'
import { AuthProvider } from '@/lib/auth'
import { NOBODY_OFF_MESSAGE } from '@/lib/teamCalendar'
import { makeUserJwt } from '@/test-support/jwt'
import { sizeTokens, remToPx } from '@/test-support/tokens'
import { routes } from '@/routes'
import type { CalendarEntry, LeaveStatus } from '@/types/api'
import type { PublicHoliday } from '@/lib/publicHolidays'

const MANAGER_ID = 2

const NOW = new Date('2026-08-12T09:00:00Z')

const WCAG_258_MINIMUM_PX = 24

interface EntryInput {
  employee_id?: number
  name?: string
  start_date: string
  end_date: string
  status?: LeaveStatus
}

function entry({
  employee_id = 1,
  name = 'Sophia Lambert',
  start_date,
  end_date,
  status = 'Approved',
}: EntryInput): CalendarEntry {
  return {
    employee_id,
    name,
    department_id: 1,
    leave_type: 'Vacation',
    start_date,
    end_date,
    status,
  }
}

function jsonOk(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response
}

interface StubOptions {
  entries?: CalendarEntry[]
  holidays?: PublicHoliday[]
}

function stubApi({ entries = [], holidays = [] }: StubOptions = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/public-holidays')) return jsonOk(holidays)
    return jsonOk({ data: entries })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderCalendar() {
  setStoredToken(
    makeUserJwt({
      id: MANAGER_ID,
      email: 'manager@company.com',
      role: 'Manager',
    })
  )
  const router = createMemoryRouter(routes, {
    initialEntries: ['/team-calendar'],
  })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
  return router
}

function calendarUrls(fetchMock: ReturnType<typeof stubApi>): string[] {
  return fetchMock.mock.calls
    .map((call) => String(call[0]))
    .filter((url) => url.includes('/api/leave-requests/calendar'))
}

function dayCell(date: string): HTMLElement {
  const cell = document.querySelector(
    `[data-testid="calendar-day"][data-date="${date}"]`
  )
  if (!cell) throw new Error(`No calendar cell for ${date}`)
  return cell as HTMLElement
}

function bars(): HTMLElement[] {
  return screen.queryAllByTestId('leave-bar')
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

describe('the month grid', () => {
  it('shows seven day columns from Monday to Sunday, weekends included', async () => {
    stubApi()
    renderCalendar()
    await screen.findByTestId('calendar-month')

    expect(
      screen.getAllByTestId('weekday-heading').map((el) => el.textContent)
    ).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })

  it('renders one row per week', async () => {
    stubApi()
    renderCalendar()
    await screen.findByTestId('calendar-month')

    const weeks = screen.getAllByTestId('calendar-week')
    expect(weeks).toHaveLength(6)
    for (const week of weeks) {
      expect(within(week).getAllByTestId('calendar-day')).toHaveLength(7)
    }
  })

  it('names the employee on the bar and spans the days booked', async () => {
    stubApi({
      entries: [entry({ start_date: '2026-08-03', end_date: '2026-08-05' })],
    })
    renderCalendar()
    await screen.findByTestId('calendar-month')

    const bar = bars()[0]!
    expect(bar).toHaveTextContent('Sophia L.')
    expect(bar).toHaveTextContent(
      'Sophia Lambert, Vacation, 3 Aug 2026 – 5 Aug 2026'
    )
    expect(bar.style.gridColumn).toBe('1 / span 3')
  })
})

describe('a range spanning a weekend', () => {
  it('renders across all seven columns of the week', async () => {
    stubApi({
      entries: [entry({ start_date: '2026-08-03', end_date: '2026-08-09' })],
    })
    renderCalendar()
    await screen.findByTestId('calendar-month')

    const week = screen
      .getAllByTestId('calendar-week')
      .find((el) => within(el).queryByTestId('leave-bar'))!
    const bar = within(week).getByTestId('leave-bar')

    expect(bar.style.gridColumn).toBe('1 / span 7')
    expect(
      within(week)
        .getAllByTestId('calendar-day')
        .map((el) => el.dataset.date)
    ).toEqual([
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09',
    ])
  })
})

describe('a range spanning a month boundary', () => {
  const crossing = entry({ start_date: '2026-07-30', end_date: '2026-08-03' })

  it('renders its August part in August', async () => {
    stubApi({ entries: [crossing] })
    renderCalendar()
    await screen.findByTestId('calendar-month')

    expect(bars().map((bar) => bar.style.gridColumn)).toEqual([
      '4 / span 4',
      '1 / span 1',
    ])
  })

  it('renders its July part in July', async () => {
    stubApi({ entries: [crossing] })
    renderCalendar()
    await screen.findByTestId('calendar-month')

    fireEvent.click(screen.getByTestId('previous-month'))
    expect(await screen.findByTestId('calendar-month')).toHaveTextContent(
      'July 2026'
    )

    expect(bars().map((bar) => bar.style.gridColumn)).toEqual([
      '4 / span 4',
      '1 / span 1',
    ])
  })
})

describe('overlapping absences', () => {
  it('shows both absences on the same day without any interaction', async () => {
    stubApi({
      entries: [
        entry({
          employee_id: 1,
          name: 'Sophia Lambert',
          start_date: '2026-08-21',
          end_date: '2026-08-21',
        }),
        entry({
          employee_id: 2,
          name: 'Aiden Kumar',
          start_date: '2026-08-21',
          end_date: '2026-08-21',
        }),
      ],
    })
    renderCalendar()
    await screen.findByTestId('calendar-month')

    const rendered = bars()
    expect(rendered).toHaveLength(2)
    expect(rendered.map((bar) => bar.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Sophia L.'),
        expect.stringContaining('Aiden K.'),
      ])
    )
    expect(new Set(rendered.map((bar) => bar.style.gridRow)).size).toBe(2)
    for (const bar of rendered) expect(bar).toBeVisible()
  })
})

describe('status', () => {
  it('shows Approved leave only, not Pending or Rejected', async () => {
    stubApi({
      entries: [
        entry({
          employee_id: 1,
          name: 'Sophia Lambert',
          start_date: '2026-08-10',
          end_date: '2026-08-10',
        }),
        entry({
          employee_id: 2,
          name: 'Mia Jensen',
          start_date: '2026-08-11',
          end_date: '2026-08-11',
          status: 'Pending',
        }),
        entry({
          employee_id: 3,
          name: 'Lucas Tran',
          start_date: '2026-08-12',
          end_date: '2026-08-12',
          status: 'Rejected',
        }),
      ],
    })
    renderCalendar()
    await screen.findByTestId('calendar-month')

    expect(bars()).toHaveLength(1)
    expect(screen.getByTestId('leave-bar')).toHaveTextContent('Sophia L.')
    expect(screen.queryByText(/Mia J\./)).not.toBeInTheDocument()
    expect(screen.queryByText(/Lucas T\./)).not.toBeInTheDocument()
  })
})

describe('public holidays', () => {
  const holidays: PublicHoliday[] = [
    { id: 1, date: '2026-08-31', name: 'Summer bank holiday' },
  ]

  it('marks the holiday distinctly from a leave bar', async () => {
    stubApi({
      entries: [entry({ start_date: '2026-08-31', end_date: '2026-08-31' })],
      holidays,
    })
    renderCalendar()
    await screen.findByTestId('calendar-month')

    const marker = await screen.findByTestId('public-holiday')
    expect(marker).toHaveTextContent('Summer bank holiday')

    const cell = dayCell('2026-08-31')
    const bar = screen.getByTestId('leave-bar')
    expect(cell.className).toContain('bg-pending-background')
    expect(bar.className).toContain('bg-sage-background')
    expect(cell.className).not.toContain('bg-sage-background')
  })

  it('names the holiday in the accessible name of the day', async () => {
    stubApi({ holidays })
    renderCalendar()
    await screen.findByTestId('calendar-month')

    expect(dayCell('2026-08-31')).toHaveAccessibleName(
      'Monday, 31 August 2026, Summer bank holiday, public holiday'
    )
  })
})

describe('month navigation', () => {
  it('loads the grid range for the month ahead', async () => {
    const fetchMock = stubApi()
    renderCalendar()
    await screen.findByTestId('calendar-month')

    fireEvent.click(screen.getByTestId('next-month'))
    expect(await screen.findByTestId('calendar-month')).toHaveTextContent(
      'September 2026'
    )

    const urls = calendarUrls(fetchMock)
    expect(urls[0]).toContain('from=2026-07-27&to=2026-09-06')
    expect(urls[urls.length - 1]).toContain('from=2026-08-31&to=2026-10-11')
  })

  it('loads the grid range for the month behind', async () => {
    const fetchMock = stubApi()
    renderCalendar()
    await screen.findByTestId('calendar-month')

    fireEvent.click(screen.getByTestId('previous-month'))
    expect(await screen.findByTestId('calendar-month')).toHaveTextContent(
      'July 2026'
    )

    expect(calendarUrls(fetchMock).at(-1)).toContain(
      'from=2026-06-29&to=2026-08-09'
    )
  })

  it('returns to the starting month after forward then backward', async () => {
    stubApi()
    renderCalendar()
    await screen.findByTestId('calendar-month')

    fireEvent.click(screen.getByTestId('next-month'))
    fireEvent.click(screen.getByTestId('previous-month'))

    expect(screen.getByTestId('calendar-month')).toHaveTextContent(
      'August 2026'
    )
  })
})

describe('WCAG 2.5.7 dragging movements', () => {
  it('completes a range by clicking a start date then an end date', async () => {
    stubApi()
    renderCalendar()
    await screen.findByTestId('calendar-month')

    fireEvent.click(dayCell('2026-08-10'))
    expect(screen.getByTestId('selection-status')).toHaveTextContent(
      'Start date Monday, 10 August 2026 selected'
    )
    expect(dayCell('2026-08-10')).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(dayCell('2026-08-14'))

    const modal = await screen.findByTestId('modal')
    expect(within(modal).getByLabelText('Start date')).toHaveTextContent(
      '10 Aug 2026'
    )
    expect(within(modal).getByLabelText('End date')).toHaveTextContent(
      '14 Aug 2026'
    )
  })

  it('orders the range when the second click is the earlier date', async () => {
    stubApi()
    renderCalendar()
    await screen.findByTestId('calendar-month')

    fireEvent.click(dayCell('2026-08-14'))
    fireEvent.click(dayCell('2026-08-10'))

    const modal = await screen.findByTestId('modal')
    expect(within(modal).getByLabelText('Start date')).toHaveTextContent(
      '10 Aug 2026'
    )
    expect(within(modal).getByLabelText('End date')).toHaveTextContent(
      '14 Aug 2026'
    )
  })

  it('books a single day when the same date is clicked twice', async () => {
    stubApi()
    renderCalendar()
    await screen.findByTestId('calendar-month')

    fireEvent.click(dayCell('2026-08-10'))
    fireEvent.click(dayCell('2026-08-10'))

    const modal = await screen.findByTestId('modal')
    expect(within(modal).getByLabelText('End date')).toHaveTextContent(
      '10 Aug 2026'
    )
  })

  it('lets a started selection be cleared without opening the modal', async () => {
    stubApi()
    renderCalendar()
    await screen.findByTestId('calendar-month')

    fireEvent.click(dayCell('2026-08-10'))
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    expect(dayCell('2026-08-10')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('selection-status')).toHaveTextContent(
      'Select a start date, then an end date'
    )
  })

  it('announces selection progress in a live region', async () => {
    stubApi()
    renderCalendar()
    await screen.findByTestId('calendar-month')

    expect(screen.getByTestId('selection-status')).toHaveAttribute(
      'aria-live',
      'polite'
    )
  })
})

describe('WCAG 2.5.8 target size', () => {
  it('gives every calendar cell and control the touch-target class', async () => {
    stubApi({
      entries: [entry({ start_date: '2026-08-03', end_date: '2026-08-05' })],
      holidays: [{ id: 1, date: '2026-08-31', name: 'Summer bank holiday' }],
    })
    renderCalendar()
    await screen.findByTestId('calendar-month')

    const calendar = screen.getByTestId('screen-team-calendar')
    const controls = Array.from(
      calendar.querySelectorAll('button, a, input, select, textarea')
    )

    expect(controls.length).toBeGreaterThan(0)
    const undersized = controls
      .filter((el) => !el.classList.contains('touch-target'))
      .map((el) => el.textContent?.trim().slice(0, 24) ?? el.tagName)
    expect(undersized).toEqual([])
    expect(screen.getAllByTestId('calendar-day')).toHaveLength(42)
  })

  it('sizes the touch-target token above the 24px minimum', () => {
    expect(remToPx(sizeTokens['touch-target']!)).toBeGreaterThanOrEqual(
      WCAG_258_MINIMUM_PX
    )
  })
})

describe('the header', () => {
  it('summarises who is off', async () => {
    stubApi({
      entries: [
        entry({
          employee_id: 1,
          start_date: '2026-08-10',
          end_date: '2026-08-14',
        }),
        entry({
          employee_id: 2,
          name: 'Olivia Reed',
          start_date: '2026-08-24',
          end_date: '2026-08-25',
        }),
      ],
    })
    renderCalendar()
    await screen.findByTestId('calendar-month')

    expect(
      await screen.findByText('2 people off this month · 1 away this week')
    ).toBeInTheDocument()
  })

  it('says so when nobody is off', async () => {
    stubApi()
    renderCalendar()

    expect(await screen.findByText(NOBODY_OFF_MESSAGE)).toBeInTheDocument()
  })
})

describe('failures', () => {
  it('offers a retry when the calendar cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      }))
    )
    renderCalendar()

    expect(await screen.findByTestId('error-state')).toHaveTextContent(
      'Server error'
    )
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument()
  })
})
