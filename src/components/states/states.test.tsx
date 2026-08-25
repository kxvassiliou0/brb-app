import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RequestsTable from '@/components/RequestsTable'
import { setStoredToken } from '@/lib/api'
import { AuthProvider } from '@/lib/auth'
import { makeUserJwt } from '@/test/jwt'
import { readFile } from '@/test/tokens'
import Requests from '@/screens/shared/Requests'
import type { LeaveRequest } from '@/types/api'
import EmptyState from './EmptyState'
import ErrorState from './ErrorState'
import LoadingState from './LoadingState'
import TableEmptyState from './TableEmptyState'
import TableErrorState from './TableErrorState'
import TableLoadingState from './TableLoadingState'
import {
  DEFAULT_SKELETON_ROWS,
  STATE_MIN_HEIGHT,
  TABLE_ROW_HEIGHT,
} from './metrics'

const REQUEST_COLUMNS = 5

function request(id: number): LeaveRequest {
  return {
    id,
    employee_id: id,
    employee_name: `Employee ${id}`,
    department_id: 1,
    department_name: 'Engineering',
    leave_type: 'Vacation',
    start_date: '2026-09-01',
    end_date: '2026-09-04',
    days_requested: 4,
    date_requested: '2026-08-01',
    status: 'Pending',
    reason: null,
    manager_note: null,
    reviewed_by_name: null,
  }
}

function jsonOk(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data }),
  } as unknown as Response
}

function renderTable(body: ReactNode) {
  return render(<table>{body}</table>)
}

function rowMetrics(container: HTMLElement) {
  return Array.from(container.querySelectorAll('tbody tr')).map((row) => ({
    height: (row as HTMLElement).style.height,
    cells: row.querySelectorAll('td').length,
  }))
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('skeleton dimensions', () => {
  it('reserves the same rows, columns and row height as the loaded content', () => {
    const rows = Array.from({ length: DEFAULT_SKELETON_ROWS }, (_, i) =>
      request(i + 1)
    )

    const table = (value: LeaveRequest[] | null) => (
      <MemoryRouter>
        <RequestsTable
          rows={value}
          error={null}
          onRetry={() => {}}
          showEmployee={false}
          showReviewer={false}
          onDecide={null}
          onOpen={() => {}}
          decidingId={null}
          highlightRequestId={null}
          emptyMessage="Nothing here"
          emptyAction={null}
        />
      </MemoryRouter>
    )

    const { container, rerender } = render(table(null))

    const skeletonMetrics = rowMetrics(container)
    expect(skeletonMetrics).toHaveLength(DEFAULT_SKELETON_ROWS)
    expect(skeletonMetrics.every((m) => m.cells === REQUEST_COLUMNS)).toBe(true)
    expect(skeletonMetrics.every((m) => m.height === TABLE_ROW_HEIGHT)).toBe(
      true
    )

    rerender(table(rows))

    expect(rowMetrics(container)).toEqual(skeletonMetrics)
  })

  it('keeps every non-table state in an identically sized region', () => {
    const { unmount } = render(<LoadingState />)
    const loading = screen.getByTestId('loading-state').style.minHeight
    unmount()

    render(<EmptyState message="Nothing here" />)
    const empty = screen.getByTestId('empty-state').style.minHeight

    render(<ErrorState error={new Error('boom')} />)
    const error = screen.getByTestId('error-state').style.minHeight

    expect(loading).toBe(STATE_MIN_HEIGHT)
    expect(empty).toBe(STATE_MIN_HEIGHT)
    expect(error).toBe(STATE_MIN_HEIGHT)
  })
})

describe('EmptyState', () => {
  it('renders its message', () => {
    render(<EmptyState message="No requests to review yet." />)
    expect(screen.getByText('No requests to review yet.')).toBeInTheDocument()
  })

  it('renders an optional call to action', () => {
    render(
      <EmptyState
        message="No requests to review yet."
        action={<button type="button">New request</button>}
      />
    )
    expect(
      screen.getByRole('button', { name: 'New request' })
    ).toBeInTheDocument()
  })

  it('omits the call to action when none is given', () => {
    render(<EmptyState message="No requests to review yet." />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('renders the message from the shared API error handler', () => {
    render(<ErrorState error={new Error('Request failed with status 500')} />)
    expect(
      screen.getByText('Request failed with status 500')
    ).toBeInTheDocument()
  })

  it('falls back to a generic message for a non-Error rejection', () => {
    render(<ErrorState error={null} />)
    expect(
      screen.getByText('Something went wrong. Please try again.')
    ).toBeInTheDocument()
  })

  it('calls the retry handler', () => {
    const onRetry = vi.fn()
    render(<ErrorState error={new Error('boom')} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('refires the request when retried from a screen', async () => {
    let historyCalls = 0
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/remaining/')) {
        return jsonOk({
          annual_allowance: 25,
          days_used: 0,
          days_remaining: 25,
        })
      }
      historyCalls += 1
      if (historyCalls === 1) throw new Error('Failed to fetch')
      return jsonOk([request(1)])
    })

    setStoredToken(
      makeUserJwt({ id: 1, email: 'priya@company.com', role: 'Employee' })
    )

    render(
      <MemoryRouter>
        <AuthProvider>
          <Requests />
        </AuthProvider>
      </MemoryRouter>
    )

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Failed to fetch')).toBeInTheDocument()
    expect(historyCalls).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Vacation')).toBeInTheDocument()
    expect(historyCalls).toBe(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('assistive technology announcements', () => {
  it('marks the loading state as a busy status region', () => {
    render(<LoadingState label="Loading requests" />)
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(region).toHaveTextContent('Loading requests')
  })

  it('announces the empty state politely', () => {
    render(<EmptyState message="No requests to review yet." />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'No requests to review yet.'
    )
  })

  it('announces the error state assertively', () => {
    render(<ErrorState error={new Error('boom')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('boom')
  })

  it('announces the table loading state', () => {
    renderTable(<TableLoadingState columns={4} label="Loading requests" />)
    expect(screen.getByTestId('table-loading-state')).toHaveAttribute(
      'aria-busy',
      'true'
    )
    expect(screen.getByRole('status')).toHaveTextContent('Loading requests')
  })

  it('announces the table empty state', () => {
    renderTable(<TableEmptyState columns={4} message="Nothing to review." />)
    expect(screen.getByRole('status')).toHaveTextContent('Nothing to review.')
  })

  it('announces the table error state', () => {
    renderTable(<TableErrorState columns={4} error={new Error('boom')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('boom')
  })

  it('hides the decorative skeleton bars from assistive technology', () => {
    render(<LoadingState />)
    for (const bar of screen.getAllByTestId('skeleton')) {
      expect(bar).toHaveAttribute('aria-hidden', 'true')
    }
  })
})

describe('table variants', () => {
  it('renders one skeleton cell per column in every row', () => {
    const { container } = renderTable(
      <TableLoadingState columns={REQUEST_COLUMNS} rows={4} />
    )
    const rows = Array.from(container.querySelectorAll('tbody tr'))
    expect(rows).toHaveLength(4)
    for (const row of rows) {
      expect(row.querySelectorAll('td')).toHaveLength(REQUEST_COLUMNS)
    }
  })

  it('spans the empty state across every column', () => {
    const { container } = renderTable(
      <TableEmptyState columns={REQUEST_COLUMNS} message="Nothing to review." />
    )
    const cells = container.querySelectorAll('tbody td')
    expect(cells).toHaveLength(1)
    expect(cells[0]).toHaveAttribute('colspan', String(REQUEST_COLUMNS))
  })

  it('spans the error state across every column', () => {
    const { container } = renderTable(
      <TableErrorState columns={REQUEST_COLUMNS} error={new Error('boom')} />
    )
    const cells = container.querySelectorAll('tbody td')
    expect(cells).toHaveLength(1)
    expect(cells[0]).toHaveAttribute('colspan', String(REQUEST_COLUMNS))
  })

  it('reserves the shared row height in every variant', () => {
    for (const variant of [
      <TableLoadingState key="l" columns={3} rows={1} />,
      <TableEmptyState key="e" columns={3} message="Nothing to review." />,
      <TableErrorState key="x" columns={3} error={new Error('boom')} />,
    ]) {
      const { container, unmount } = renderTable(variant)
      const row = container.querySelector('tbody tr') as HTMLElement
      expect(row.style.height).toBe(TABLE_ROW_HEIGHT)
      unmount()
    }
  })
})

describe('tokens reference page', () => {
  const page = readFile('docs/tokens.md')

  it.each([
    'LoadingState',
    'EmptyState',
    'ErrorState',
    'TableLoadingState',
    'TableEmptyState',
    'TableErrorState',
    'Skeleton',
  ])('documents %s', (name) => {
    expect(page).toContain(name)
  })
})
