import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RequestsTable from '@/components/requests/RequestsTable'
import type { LeaveRequest } from '@/types/api'
import EmptyState from './EmptyState'
import ErrorState from './ErrorState'
import LoadingState from './LoadingState'
import { DEFAULT_SKELETON_ROWS, TABLE_ROW_HEIGHT } from './metrics'

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
          onCancel={null}
          onOpen={() => {}}
          decidingId={null}
          cancellingId={null}
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
})

describe('EmptyState', () => {
  it('renders its message', () => {
    render(<EmptyState message="No requests to review yet." />)
    expect(screen.getByText('No requests to review yet.')).toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('renders the message from the shared API error handler', () => {
    render(<ErrorState error={new Error('Request failed with status 500')} />)
    expect(
      screen.getByText('Request failed with status 500')
    ).toBeInTheDocument()
  })

  it('calls the retry handler', () => {
    const onRetry = vi.fn()
    render(<ErrorState error={new Error('boom')} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
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
})
