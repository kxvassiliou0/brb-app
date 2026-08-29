import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest'
import AddEmployeeModal from '@/components/employees/AddEmployeeModal'
import { clearApiCache } from '@/lib/apiCache'
import {
  DEFAULT_ANNUAL_LEAVE_ALLOWANCE,
  DUPLICATE_EMAIL_MESSAGE,
  PASSWORD_MIN_LENGTH,
} from '@/lib/employeeAdmin'
import type { CreateUserBody, UserListItem } from '@/types/api'

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

const DEPARTMENTS = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Human Resources' },
]

const JOB_ROLES = [
  { id: 2, name: 'Senior Contractor' },
  { id: 5, name: 'Contractor' },
]

const NEW_STARTER = {
  firstName: 'Nina',
  lastName: 'Newstarter',
  email: 'nina.newstarter@company.com',
  departmentId: '2',
  jobRoleId: '5',
  password: 'first-password',
}

type FetchMock = Mock<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>

interface CreateFailure {
  message: string
  status: number
}

let fetchMock: FetchMock

function stubApi(failure?: CreateFailure): void {
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'POST') {
      return {
        ok: !failure,
        status: failure ? failure.status : 201,
        json: async () =>
          failure ? { error: failure.message } : { data: { id: 9 } },
      } as unknown as Response
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: url.includes('/api/departments') ? DEPARTMENTS : JOB_ROLES,
      }),
    } as unknown as Response
  })
  vi.stubGlobal('fetch', fetchMock)
}

function renderModal(failure?: CreateFailure) {
  stubApi(failure)
  const onClose = vi.fn()
  const onCreated = vi.fn()
  render(
    <AddEmployeeModal
      employees={[BOB]}
      onClose={onClose}
      onCreated={onCreated}
    />
  )
  return { onClose, onCreated }
}

async function loaded(): Promise<HTMLElement> {
  return screen.findByTestId('add-employee-form')
}

function field(label: string | RegExp): HTMLElement {
  return screen.getByLabelText(label)
}

function type(label: string, value: string): void {
  fireEvent.change(field(label), { target: { value } })
}

function fillRequiredFields(): void {
  type('First name', NEW_STARTER.firstName)
  type('Last name', NEW_STARTER.lastName)
  type('Email', NEW_STARTER.email)
  type('Department', NEW_STARTER.departmentId)
  type('Job role', NEW_STARTER.jobRoleId)
  type('Password', NEW_STARTER.password)
}

function add(): void {
  fireEvent.submit(screen.getByTestId('add-employee-form'))
}

function postCalls(): unknown[][] {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
}

function postBody(): CreateUserBody {
  const call = postCalls()[0]!
  return JSON.parse(String((call[1] as RequestInit).body)) as CreateUserBody
}

function optionLabels(label: string): (string | null)[] {
  return Array.from(field(label).querySelectorAll('option')).map(
    (option) => option.textContent
  )
}

beforeEach(() => {
  clearApiCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the choices offered by the add employee form', () => {
  it('builds the department options from GET /api/departments', async () => {
    renderModal()
    await loaded()

    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).endsWith('/api/departments')
      )
    ).toBe(true)
    expect(optionLabels('Department')).toEqual([
      'Select a department',
      'Engineering',
      'Human Resources',
    ])
  })

  it('builds the job role options from GET /api/job-roles', async () => {
    renderModal()
    await loaded()

    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).endsWith('/api/job-roles')
      )
    ).toBe(true)
    expect(optionLabels('Job role')).toEqual([
      'Select a job role',
      'Senior Contractor',
      'Contractor',
    ])
  })

  it('offers exactly the three roles the API accepts', async () => {
    renderModal()
    await loaded()

    expect(optionLabels('Role')).toEqual(['Employee', 'Manager', 'Admin'])
    expect(field('Role')).toHaveValue('Employee')
  })

  it('offers every existing user as a possible line manager, plus none at all', async () => {
    renderModal()
    await loaded()

    expect(optionLabels('Line manager')).toEqual([
      'No line manager',
      'Bob Mitchell',
    ])
    expect(field('Line manager')).toHaveValue('')
  })

  it('starts the allowance at the twenty five days the entity defaults to', async () => {
    renderModal()
    await loaded()

    expect(field('Annual leave allowance (days)')).toHaveValue(
      DEFAULT_ANNUAL_LEAVE_ALLOWANCE
    )
  })
})

describe('the fields the add employee form insists on', () => {
  const required: [string, string][] = [
    ['First name', 'Please enter a first name'],
    ['Last name', 'Please enter a last name'],
    ['Email', 'Please enter an email address'],
    ['Department', 'Please choose a department'],
    ['Job role', 'Please choose a job role'],
    ['Password', 'Please enter a password'],
  ]

  it.each(required)(
    'blocks submission when %s is left empty',
    async (label, message) => {
      const { onCreated } = renderModal()
      await loaded()

      fillRequiredFields()
      type(label, '')
      add()

      expect(await screen.findByText(message)).toBeInTheDocument()
      expect(postCalls()).toHaveLength(0)
      expect(onCreated).not.toHaveBeenCalled()
    }
  )

  it('blocks submission when the allowance is cleared', async () => {
    const { onCreated } = renderModal()
    await loaded()

    fillRequiredFields()
    type('Annual leave allowance (days)', '')
    add()

    expect(
      await screen.findByText('Please enter an annual leave allowance')
    ).toBeInTheDocument()
    expect(postCalls()).toHaveLength(0)
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('refuses a password below the ten character minimum without calling the API', async () => {
    const { onCreated } = renderModal()
    await loaded()

    fillRequiredFields()
    type('Password', 'a'.repeat(PASSWORD_MIN_LENGTH - 1))
    add()

    expect(
      await screen.findByText(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
      )
    ).toBeInTheDocument()
    expect(postCalls()).toHaveLength(0)
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('accepts a password of exactly ten characters', async () => {
    const { onCreated } = renderModal()
    await loaded()

    fillRequiredFields()
    type('Password', 'a'.repeat(PASSWORD_MIN_LENGTH))
    add()

    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(postBody().password).toBe('a'.repeat(PASSWORD_MIN_LENGTH))
  })
})

describe('creating the employee', () => {
  it('posts the completed form to /api/users and returns to the list', async () => {
    const { onCreated, onClose } = renderModal()
    await loaded()

    fillRequiredFields()
    type('Role', 'Manager')
    type('Line manager', String(BOB.id))
    type('Annual leave allowance (days)', '28')
    add()

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onCreated).toHaveBeenCalled()
    expect(String(postCalls()[0]?.[0])).toContain('/api/users')
    expect(postBody()).toEqual({
      firstName: NEW_STARTER.firstName,
      lastName: NEW_STARTER.lastName,
      email: NEW_STARTER.email,
      role: 'Manager',
      annualLeaveAllowance: 28,
      departmentId: 2,
      jobRoleId: 5,
      managerId: BOB.id,
      password: NEW_STARTER.password,
    })
  })

  it('sends a null managerId when no line manager is chosen', async () => {
    const { onCreated } = renderModal()
    await loaded()

    fillRequiredFields()
    add()

    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(postBody().managerId).toBeNull()
  })

  it('sends the twenty five day default when the allowance is left untouched', async () => {
    const { onCreated } = renderModal()
    await loaded()

    fillRequiredFields()
    add()

    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(postBody().annualLeaveAllowance).toBe(DEFAULT_ANNUAL_LEAVE_ALLOWANCE)
  })

  it('reads a refused duplicate email back against the email field', async () => {
    const { onCreated, onClose } = renderModal({
      message: 'That email address already belongs to another user',
      status: 409,
    })
    await loaded()

    fillRequiredFields()
    add()

    expect(await screen.findByText(DUPLICATE_EMAIL_MESSAGE)).toBeInTheDocument()
    expect(field('Email')).toHaveAccessibleDescription(DUPLICATE_EMAIL_MESSAGE)
    expect(field('Email')).toHaveValue(NEW_STARTER.email)
    expect(onCreated).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('reads a raw driver duplicate error back against the email field too', async () => {
    renderModal({
      message: "Duplicate entry 'nina.newstarter@company.com' for key 'IDX_97'",
      status: 400,
    })
    await loaded()

    fillRequiredFields()
    add()

    expect(await screen.findByText(DUPLICATE_EMAIL_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the form open and reports any other refusal', async () => {
    const { onCreated } = renderModal({
      message: 'Annual leave allowance must be a positive number',
      status: 422,
    })
    await loaded()

    fillRequiredFields()
    add()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Annual leave allowance must be a positive number'
    )
    expect(screen.getByTestId('add-employee-form')).toBeInTheDocument()
    expect(onCreated).not.toHaveBeenCalled()
  })
})
