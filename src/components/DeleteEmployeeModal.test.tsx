import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import DeleteEmployeeModal from '@/components/DeleteEmployeeModal'
import { DELETE_ACKNOWLEDGEMENT } from '@/lib/employeeAdmin'
import type { UserListItem } from '@/types/api'

function employee(overrides: Partial<UserListItem> = {}): UserListItem {
  return {
    id: 4,
    firstName: 'David',
    lastName: 'Jones',
    email: 'david.jones@company.com',
    role: 'Employee',
    annualLeaveAllowance: 22,
    department: { id: 1, name: 'Engineering' },
    jobRole: { id: 5, name: 'Contractor' },
    manager: { id: 2, name: 'Bob Mitchell' },
    ...overrides,
  }
}

const DAVID = employee()

const EVE = employee({
  id: 5,
  firstName: 'Eve',
  lastName: 'Knowles',
  email: 'eve.knowles@company.com',
})

const BOB = employee({
  id: 2,
  firstName: 'Bob',
  lastName: 'Mitchell',
  email: 'bob.mitchell@company.com',
  role: 'Manager',
  manager: null,
})

const GRACE = employee({
  id: 7,
  firstName: 'Grace',
  lastName: 'Williams',
  email: 'grace.williams@company.com',
  manager: null,
})

const ROSTER = [BOB, DAVID, EVE, GRACE]

type FetchMock = Mock<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>

let fetchMock: FetchMock

function stubApi(deleteError?: string): void {
  fetchMock = vi.fn(
    async () =>
      ({
        ok: !deleteError,
        status: deleteError ? 404 : 200,
        json: async () =>
          deleteError ? { error: deleteError } : { data: 'User deleted' },
      }) as unknown as Response
  )
  vi.stubGlobal('fetch', fetchMock)
}

function renderModal(target: UserListItem = DAVID, deleteError?: string) {
  stubApi(deleteError)
  const onClose = vi.fn()
  const onDeleted = vi.fn()
  render(
    <DeleteEmployeeModal
      employee={target}
      employees={ROSTER}
      onClose={onClose}
      onDeleted={onDeleted}
    />
  )
  return { onClose, onDeleted }
}

function accept(): void {
  fireEvent.click(screen.getByLabelText(DELETE_ACKNOWLEDGEMENT))
}

function confirmButton(name: string): HTMLElement {
  return screen.getByRole('button', { name: `Delete ${name}` })
}

function consequences(): string {
  return (
    screen.getByTestId('delete-confirmation').parentElement?.textContent ?? ''
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the delete confirmation', () => {
  it('names the person being deleted rather than asking in the abstract', () => {
    renderModal()

    expect(
      screen.getByRole('heading', { name: 'Delete David Jones?' })
    ).toBeInTheDocument()
  })

  it('states that this specific person’s leave requests are deleted with them', () => {
    renderModal()

    const text = consequences()
    expect(text).toContain('Every leave request David Jones has made')
    expect(text).toContain('deleted along with the account')
    expect(text).toContain('cannot be recovered')
  })

  it('names the right person when a different row is deleted', () => {
    renderModal(GRACE)

    expect(consequences()).toContain('Every leave request Grace Williams')
    expect(consequences()).not.toContain('David Jones')
  })

  it('warns that a deleted manager leaves their reports without a line manager', () => {
    renderModal(BOB)

    const text = consequences()
    expect(text).toContain('2 people report to Bob Mitchell')
    expect(text).toContain('kept, but left without a line manager')
  })

  it('says the reports survive rather than being deleted too', () => {
    renderModal(BOB)

    expect(consequences()).not.toContain('reports will be deleted')
    expect(consequences()).toContain('They will be kept')
  })

  it('promises the requests a reviewer decided stay in the history', () => {
    renderModal(BOB)

    const text = consequences()
    expect(text).toContain('stay in the history')
    expect(text).toContain('no longer name who reviewed them')
  })

  it('leaves out the reports warning for someone who manages nobody', () => {
    renderModal(GRACE)

    expect(consequences()).not.toContain('line manager')
  })

  it('never asks the Admin to retype anything it already knows', () => {
    renderModal()

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByLabelText(DELETE_ACKNOWLEDGEMENT)).toHaveAttribute(
      'type',
      'checkbox'
    )
  })
})

describe('accepting the consequences', () => {
  it('fires no request while the confirmation is unaccepted', () => {
    const { onDeleted } = renderModal()

    fireEvent.click(confirmButton('David Jones'))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('keeps the delete button disabled until the box is ticked', () => {
    renderModal()

    expect(confirmButton('David Jones')).toBeDisabled()
    accept()
    expect(confirmButton('David Jones')).toBeEnabled()
  })

  it('stops again if the Admin unticks the box', () => {
    renderModal()

    accept()
    accept()

    expect(confirmButton('David Jones')).toBeDisabled()
    fireEvent.click(confirmButton('David Jones'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('deletes the employee once accepted and confirmed', async () => {
    const { onClose, onDeleted } = renderModal()

    accept()
    fireEvent.click(confirmButton('David Jones'))

    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    expect(onClose).toHaveBeenCalled()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toContain('/api/users/4')
    expect(init?.method).toBe('DELETE')
  })

  it('backs out without a request when the Admin keeps the employee', () => {
    const { onClose, onDeleted } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Keep David Jones' }))

    expect(onClose).toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a refused deletion and stays open', async () => {
    const { onClose, onDeleted } = renderModal(DAVID, 'User not found')

    accept()
    fireEvent.click(confirmButton('David Jones'))

    expect(await screen.findByRole('alert')).toHaveTextContent('User not found')
    expect(onDeleted).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
