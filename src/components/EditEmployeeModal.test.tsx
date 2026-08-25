import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import EditEmployeeModal from '@/components/EditEmployeeModal'
import { PASSWORD_MIN_LENGTH } from '@/lib/employeeAdmin'
import type { UpdateUserBody, UserListItem, UserRecord } from '@/types/api'

const DAVID: UserListItem = {
  id: 4,
  firstName: 'David',
  lastName: 'Jones',
  email: 'david.jones@company.com',
  role: 'Employee',
  annualLeaveAllowance: 22,
  department: { id: 1, name: 'Engineering' },
  jobRole: { id: 5, name: 'Contractor' },
  manager: { id: 2, name: 'Bob Mitchell' },
}

const BOB: UserListItem = {
  id: 2,
  firstName: 'Bob',
  lastName: 'Mitchell',
  email: 'bob.mitchell@company.com',
  role: 'Manager',
  annualLeaveAllowance: 25,
  department: { id: 1, name: 'Engineering' },
  jobRole: { id: 2, name: 'Senior Contractor' },
  manager: null,
}

const RECORD: UserRecord = {
  id: 4,
  firstName: 'David',
  lastName: 'Jones',
  email: 'david.jones@company.com',
  role: 'Employee',
  annualLeaveAllowance: 22,
  departmentId: 1,
  jobRoleId: 5,
  managerId: 2,
}

const DEPARTMENTS = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Human Resources' },
]

const JOB_ROLES = [
  { id: 2, name: 'Senior Contractor' },
  { id: 5, name: 'Contractor' },
]

type FetchMock = Mock<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>

let fetchMock: FetchMock

function stubApi(record: UserRecord = RECORD, saveError?: string): void {
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'PATCH') {
      return {
        ok: !saveError,
        status: saveError ? 422 : 200,
        json: async () =>
          saveError ? { error: saveError } : { data: { id: record.id } },
      } as unknown as Response
    }
    const body = url.includes('/api/departments')
      ? DEPARTMENTS
      : url.includes('/api/job-roles')
        ? JOB_ROLES
        : record
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: body }),
    } as unknown as Response
  })
  vi.stubGlobal('fetch', fetchMock)
}

function renderModal(record: UserRecord = RECORD, saveError?: string) {
  stubApi(record, saveError)
  const onClose = vi.fn()
  const onSaved = vi.fn()
  render(
    <EditEmployeeModal
      employee={DAVID}
      employees={[BOB, DAVID]}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
  return { onClose, onSaved }
}

async function loaded(): Promise<void> {
  await screen.findByTestId('edit-employee-form')
}

function field(label: string | RegExp): HTMLElement {
  return screen.getByLabelText(label)
}

function save(): void {
  fireEvent.submit(screen.getByTestId('edit-employee-form'))
}

function patchBody(): UpdateUserBody {
  const call = fetchMock.mock.calls.find(
    ([, init]) => init?.method === 'PATCH'
  )!
  return JSON.parse(String(call[1]?.body)) as UpdateUserBody
}

function patchCalls(): unknown[][] {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('opening the edit form', () => {
  it('reads the record from GET /api/users/:id', async () => {
    renderModal()
    await loaded()

    expect(
      fetchMock.mock.calls.some(
        ([input, init]) =>
          String(input).endsWith('/api/users/4') && init?.method === undefined
      )
    ).toBe(true)
  })

  it('pre-populates every field from the fetched record', async () => {
    renderModal({
      ...RECORD,
      firstName: 'Dave',
      lastName: 'Jonas',
      email: 'dave.jonas@company.com',
      role: 'Manager',
      annualLeaveAllowance: 30,
      departmentId: 2,
      jobRoleId: 2,
      managerId: null,
    })
    await loaded()

    expect(field('First name')).toHaveValue('Dave')
    expect(field('Last name')).toHaveValue('Jonas')
    expect(field('Email')).toHaveValue('dave.jonas@company.com')
    expect(field('Role')).toHaveValue('Manager')
    expect(field('Department')).toHaveValue('2')
    expect(field('Job role')).toHaveValue('2')
    expect(field('Line manager')).toHaveValue('')
    expect(field('Annual leave allowance (days)')).toHaveValue(30)
  })

  it('asks for nothing the record already answers, so no field starts empty', async () => {
    renderModal()
    await loaded()

    const alreadyKnown = [
      'First name',
      'Last name',
      'Email',
      'Role',
      'Department',
      'Job role',
      'Annual leave allowance (days)',
    ]

    for (const label of alreadyKnown) {
      expect(field(label)).not.toHaveValue('')
    }
  })

  it('shows the line manager the record names, not a blank choice', async () => {
    renderModal()
    await loaded()

    expect(field('Line manager')).toHaveValue('2')
  })

  it('never offers the employee themselves as their own line manager', async () => {
    renderModal()
    await loaded()

    const options = Array.from(
      field('Line manager').querySelectorAll('option')
    ).map((option) => option.textContent)

    expect(options).toEqual(['No line manager', 'Bob Mitchell'])
  })

  it('leaves the password blank and says why', async () => {
    renderModal()
    await loaded()

    expect(field('New password')).toHaveValue('')
    expect(
      screen.getByText('Leave this blank to keep their current password.')
    ).toBeInTheDocument()
  })
})

describe('saving an edited employee', () => {
  it('sends no password key when the password field is left blank', async () => {
    const { onSaved } = renderModal()
    await loaded()

    fireEvent.change(field('First name'), { target: { value: 'Dave' } })
    save()

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    const body = patchBody()
    expect(body).not.toHaveProperty('password')
    expect(Object.keys(body)).not.toContain('password')
    expect(body.firstName).toBe('Dave')
  })

  it('sends the password only when the Admin types a new one', async () => {
    const { onSaved } = renderModal()
    await loaded()

    fireEvent.change(field('New password'), {
      target: { value: 'brand-new-secret' },
    })
    save()

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(patchBody().password).toBe('brand-new-secret')
  })

  it('refuses a password below the ten character minimum without calling the API', async () => {
    const { onSaved } = renderModal()
    await loaded()

    fireEvent.change(field('New password'), { target: { value: 'short' } })
    save()

    expect(
      await screen.findByText(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
      )
    ).toBeInTheDocument()
    expect(patchCalls()).toHaveLength(0)
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('accepts a password of exactly ten characters', async () => {
    const { onSaved } = renderModal()
    await loaded()

    fireEvent.change(field('New password'), {
      target: { value: 'a'.repeat(PASSWORD_MIN_LENGTH) },
    })
    save()

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(patchBody().password).toBe('a'.repeat(PASSWORD_MIN_LENGTH))
  })

  it('patches the record it opened and closes on success', async () => {
    const { onSaved, onClose } = renderModal()
    await loaded()

    fireEvent.change(field('Annual leave allowance (days)'), {
      target: { value: '30' },
    })
    save()

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onSaved).toHaveBeenCalled()
    expect(String(patchCalls()[0]?.[0])).toContain('/api/users/4')
    expect(patchBody().annualLeaveAllowance).toBe(30)
  })

  it('keeps the form open and reports why the server refused', async () => {
    const { onSaved, onClose } = renderModal(RECORD, 'Email already in use')
    await loaded()

    save()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email already in use'
    )
    expect(onSaved).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('rejects an emptied name before it reaches the API', async () => {
    renderModal()
    await loaded()

    fireEvent.change(field('First name'), { target: { value: '  ' } })
    save()

    expect(
      await screen.findByText('Please enter a first name')
    ).toBeInTheDocument()
    expect(patchCalls()).toHaveLength(0)
  })
})
