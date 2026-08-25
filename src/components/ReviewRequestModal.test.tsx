import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ReviewRequestModal from '@/components/ReviewRequestModal'
import type { LeaveRequest, RemainingLeave } from '@/types/api'

function request(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
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

function balance(overrides: Partial<RemainingLeave> = {}): RemainingLeave {
  return {
    annual_allowance: 25,
    days_used: 7,
    days_remaining: 18,
    ...overrides,
  }
}

function renderModal(
  balanceValue: RemainingLeave | null,
  overrides: Partial<LeaveRequest> = {}
) {
  render(
    <ReviewRequestModal
      request={request(overrides)}
      team={[]}
      balance={balanceValue}
      onClose={vi.fn()}
      onReviewed={vi.fn()}
    />
  )
}

function figureFor(label: string): string {
  const term = screen.getByText(label)
  const value = term.parentElement?.querySelector('dd')
  return value?.textContent ?? ''
}

describe('the balance shown while reviewing a request', () => {
  it('renders entitlement, days used and days remaining inline in the review', () => {
    renderModal(balance())

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(figureFor('Entitlement')).toBe('25 days')
    expect(figureFor('Days used')).toBe('7 days')
    expect(figureFor('Days remaining')).toBe('18 days')
  })

  it('shows the balance without leaving the review', () => {
    renderModal(balance())

    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByText('Entitlement')).toBeInTheDocument()
    expect(within(dialog).getByText('Days used')).toBeInTheDocument()
    expect(within(dialog).getByText('Days remaining')).toBeInTheDocument()
    expect(within(dialog).getByText('Balance after')).toBeInTheDocument()
  })

  it('works out what the balance would be if the request were approved', () => {
    renderModal(balance({ days_remaining: 18 }), { days_requested: 5 })

    expect(figureFor('Balance after')).toBe('13 days')
  })

  it('flags a request that would take the employee past their entitlement', () => {
    renderModal(balance({ days_remaining: 2 }), { days_requested: 5 })

    const value = screen.getByText('Days remaining').parentElement
    expect(value).toBeInTheDocument()
    expect(figureFor('Balance after')).toBe('-3 days')
  })

  it('degrades to a single unavailable row when the balance could not be read', () => {
    renderModal(null)

    expect(figureFor('Balance')).toBe('Unavailable')
    expect(figureFor('Balance after')).toBe('Unavailable')
    expect(screen.queryByText('Entitlement')).not.toBeInTheDocument()
    expect(screen.queryByText('Days used')).not.toBeInTheDocument()
  })

  it('keeps the approve and reject actions usable when the balance is missing', () => {
    renderModal(null)

    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('button', { name: /approve/i })
    ).toBeEnabled()
    expect(
      within(dialog).getByRole('button', { name: /reject|decline/i })
    ).toBeEnabled()
  })
})
