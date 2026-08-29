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
import {
  ALREADY_CANCELLED_MESSAGE,
  CANCEL_LABEL,
  CONFIRM_CANCEL_LABEL,
  KEEP_REQUEST_LABEL,
} from '@/lib/cancelRequest'
import { REQUESTS_PATH, type Role } from '@/lib/routeAccess'
import { routes } from '@/routes'
import { makeUserJwt } from '@/test-support/jwt'
import type { OwnLeaveRequest, RemainingLeave } from '@/types/api'

const USER_ID = 2

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

interface StubOptions {
  own?: OwnLeaveRequest[]
  deleteStatus?: number
  deleteError?: string
  newDaysRemaining?: number
}

function jsonOk(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data }),
  } as unknown as Response
}

function stubApi({
  own = [ownRequest()],
  deleteStatus = 200,
  deleteError,
  newDaysRemaining,
}: StubOptions = {}) {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (init?.method === 'DELETE') {
        return {
          ok: deleteStatus < 400,
          status: deleteStatus,
          json: async () =>
            deleteError
              ? { error: deleteError }
              : {
                  data: {
                    ...own[0],
                    employee_id: USER_ID,
                    status: 'Cancelled',
                    ...(newDaysRemaining === undefined
                      ? {}
                      : { new_days_remaining: newDaysRemaining }),
                  },
                },
        } as unknown as Response
      }
      if (url.includes('/remaining/')) return jsonOk(BALANCE)
      if (url.includes('/status/')) return jsonOk(own)
      if (url.includes('/api/departments')) return jsonOk([])
      return jsonOk([])
    }
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderRequests(role: Role = 'Employee') {
  setStoredToken(
    makeUserJwt({ id: USER_ID, email: `${role}@company.com`, role })
  )
  render(
    <AuthProvider>
      <RouterProvider
        router={createMemoryRouter(routes, {
          initialEntries: [REQUESTS_PATH],
        })}
      />
    </AuthProvider>
  )
}

function statusCell(): HTMLElement {
  return within(screen.getByTestId('data-table')).getAllByRole('row')[1]!
}

function deleteCalls(fetchMock: ReturnType<typeof stubApi>): unknown[] {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')
}

function remainingCalls(fetchMock: ReturnType<typeof stubApi>): unknown[] {
  return fetchMock.mock.calls.filter(([input]) =>
    String(input).includes('/remaining/')
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cancelling a request', () => {
  it('asks for confirmation and sends nothing when the user backs out', async () => {
    const fetchMock = stubApi()
    renderRequests()

    fireEvent.click(await screen.findByRole('button', { name: CANCEL_LABEL }))

    const dialog = await screen.findByTestId('modal')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    expect(deleteCalls(fetchMock)).toHaveLength(0)

    fireEvent.click(
      within(dialog).getByRole('button', { name: KEEP_REQUEST_LABEL })
    )

    await waitFor(() =>
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    )
    expect(deleteCalls(fetchMock)).toHaveLength(0)
    expect(statusCell()).toHaveTextContent('Pending')
  })

  it('sets the row to Cancelled rather than removing it', async () => {
    stubApi()
    renderRequests()

    fireEvent.click(await screen.findByRole('button', { name: CANCEL_LABEL }))
    fireEvent.click(
      await screen.findByRole('button', { name: CONFIRM_CANCEL_LABEL })
    )

    await waitFor(() => expect(statusCell()).toHaveTextContent('Cancelled'))

    expect(
      within(screen.getByTestId('data-table')).getAllByRole('row')
    ).toHaveLength(2)
    expect(screen.queryByRole('button', { name: CANCEL_LABEL })).toBeNull()
  })

  it('updates the balance from new_days_remaining without a second fetch', async () => {
    const fetchMock = stubApi({ newDaysRemaining: 23 })
    renderRequests()

    await screen.findByText(/18 days remaining of 25/)
    const before = remainingCalls(fetchMock).length

    fireEvent.click(screen.getByRole('button', { name: CANCEL_LABEL }))
    fireEvent.click(
      await screen.findByRole('button', { name: CONFIRM_CANCEL_LABEL })
    )

    await screen.findByText(/23 days remaining of 25/)
    expect(remainingCalls(fetchMock)).toHaveLength(before)
  })

  it('reports a readable error when the request is already cancelled', async () => {
    stubApi({
      deleteStatus: 400,
      deleteError: 'Leave request is already cancelled',
    })
    renderRequests()

    fireEvent.click(await screen.findByRole('button', { name: CANCEL_LABEL }))
    fireEvent.click(
      await screen.findByRole('button', { name: CONFIRM_CANCEL_LABEL })
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(ALREADY_CANCELLED_MESSAGE)
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('offers no cancel action on approved or rejected requests', async () => {
    stubApi({
      own: [
        ownRequest({ id: 1, status: 'Approved' }),
        ownRequest({ id: 2, status: 'Rejected' }),
        ownRequest({ id: 3, status: 'Cancelled' }),
      ],
    })
    renderRequests()

    await screen.findByTestId('data-table')
    expect(screen.queryByRole('button', { name: CANCEL_LABEL })).toBeNull()
  })

  it('keeps a cancelled request reachable under the Cancelled filter', async () => {
    stubApi({
      own: [
        ownRequest({ id: 1, leave_type: 'Vacation', status: 'Pending' }),
        ownRequest({ id: 2, leave_type: 'Sick', status: 'Cancelled' }),
      ],
    })
    renderRequests()

    await screen.findByTestId('data-table')

    fireEvent.click(
      within(screen.getByTestId('status-filter')).getByRole('button', {
        name: 'Cancelled',
      })
    )

    expect(screen.getByText('Sick')).toBeInTheDocument()
    expect(screen.queryByText('Vacation')).not.toBeInTheDocument()
  })
})
