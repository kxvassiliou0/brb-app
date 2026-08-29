import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
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
import { setStoredToken } from '@/lib/api'
import { AuthProvider } from '@/lib/auth'
import { JOB_ROLE, type OrgUnit } from '@/lib/orgUnits'
import { makeUserJwt } from '@/test-support/jwt'
import type { UserListItem } from '@/types/api'
import Departments from './Departments'

const ENGINEERING: OrgUnit = { id: 1, name: 'Engineering', userCount: 50 }
const FINANCE: OrgUnit = { id: 2, name: 'Finance', userCount: 0 }

const CONTRACTOR: OrgUnit = { id: 3, name: 'Contractor', userCount: 2 }
const LEAD_ENGINEER: OrgUnit = { id: 4, name: 'Lead Engineer', userCount: 0 }

const BOB: UserListItem = {
  id: 9,
  firstName: 'Bob',
  lastName: 'Mitchell',
  email: 'bob.mitchell@company.com',
  role: 'Manager',
  annualLeaveAllowance: 25,
  department: ENGINEERING,
  jobRole: CONTRACTOR,
  manager: null,
}

interface Refusal {
  status: number
  message: string
}

type FetchMock = Mock<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>

let fetchMock: FetchMock
let departments: OrgUnit[]
let jobRoles: OrgUnit[]

function respond(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    json: async () => body,
  } as unknown as Response
}

function stubApi(refusal?: Refusal): void {
  departments = [ENGINEERING, FINANCE]
  jobRoles = [CONTRACTOR, LEAD_ENGINEER]

  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const jobRoleRequest = url.includes('/api/job-roles')

    if (method === 'POST') {
      if (refusal) return respond({ error: refusal.message }, refusal.status)
      const created = {
        id: 99,
        name: JSON.parse(String(init?.body)).name as string,
        userCount: 0,
      }
      if (jobRoleRequest) jobRoles = [...jobRoles, created]
      else departments = [...departments, created]
      return respond({ data: created }, 201)
    }

    if (method === 'DELETE') {
      if (refusal) return respond({ error: refusal.message }, refusal.status)
      const id = Number(url.split('/').pop())
      if (jobRoleRequest) jobRoles = jobRoles.filter((row) => row.id !== id)
      else departments = departments.filter((row) => row.id !== id)
      return respond({ data: 'deleted' })
    }

    if (method === 'PATCH') {
      if (refusal) return respond({ error: refusal.message }, refusal.status)
      return respond({ data: { id: 1 } })
    }

    return respond({ data: jobRoleRequest ? jobRoles : departments })
  })
  vi.stubGlobal('fetch', fetchMock)
}

function signIn(): void {
  setStoredToken(
    makeUserJwt({ id: 1, email: 'admin@company.com', role: 'Admin' })
  )
}

async function renderScreen(refusal?: Refusal) {
  stubApi(refusal)
  signIn()
  render(
    <AuthProvider>
      <Departments />
    </AuthProvider>
  )
  await screen.findByText(CONTRACTOR.name)
}

function jobRolesSection(): HTMLElement {
  return screen.getByTestId('jobRole-section')
}

function departmentsSection(): HTMLElement {
  return screen.getByTestId('department-section')
}

function cardFor(section: HTMLElement, name: string): HTMLElement {
  const card = within(section)
    .getAllByTestId('org-unit-card')
    .find((node) => within(node).queryByText(name) !== null)
  if (!card) throw new Error(`No card found for ${name}`)
  return card
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the job roles on the departments screen', () => {
  it('lists every job role returned by GET /api/job-roles', async () => {
    await renderScreen()

    const names = within(jobRolesSection())
      .getAllByTestId('org-unit-name')
      .map((node) => node.textContent)
    expect(names).toEqual([CONTRACTOR.name, LEAD_ENGINEER.name])
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).endsWith('/api/job-roles')
      )
    ).toBe(true)
  })

  it('shows a user count per role that matches the assigned users', async () => {
    await renderScreen()

    expect(
      within(cardFor(jobRolesSection(), CONTRACTOR.name)).getByTestId(
        'org-unit-user-count'
      )
    ).toHaveTextContent(String(CONTRACTOR.userCount))
    expect(
      within(cardFor(jobRolesSection(), CONTRACTOR.name)).getByText('people')
    ).toBeInTheDocument()

    expect(
      within(cardFor(jobRolesSection(), LEAD_ENGINEER.name)).getByTestId(
        'org-unit-user-count'
      )
    ).toHaveTextContent('0')
  })

  it('reads one person in the singular rather than as one people', async () => {
    await renderScreen()
    fireEvent.click(
      within(jobRolesSection()).getByRole('button', { name: JOB_ROLE.addLabel })
    )
    fireEvent.change(screen.getByLabelText(JOB_ROLE.nameLabel), {
      target: { value: 'Solo Role' },
    })
    jobRoles = [...jobRoles, { id: 77, name: 'Solo Role', userCount: 1 }]
    fireEvent.submit(screen.getByTestId('jobRole-form'))

    const card = await waitFor(() => cardFor(jobRolesSection(), 'Solo Role'))
    expect(within(card).getByText('person')).toBeInTheDocument()
  })
})

describe('creating a job role', () => {
  it('posts it to /api/job-roles and shows it on the screen', async () => {
    await renderScreen()

    fireEvent.click(
      within(jobRolesSection()).getByRole('button', { name: JOB_ROLE.addLabel })
    )
    fireEvent.change(screen.getByLabelText(JOB_ROLE.nameLabel), {
      target: { value: 'Principal Engineer' },
    })
    fireEvent.submit(screen.getByTestId('jobRole-form'))

    expect(await screen.findByText('Principal Engineer')).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(
      ([input, init]) =>
        init?.method === 'POST' && String(input).endsWith('/api/job-roles')
    )
    expect(JSON.parse(String((post?.[1] as RequestInit).body))).toEqual({
      name: 'Principal Engineer',
    })
  })

  it('offers the new role in the add employee dropdown straight away', async () => {
    await renderScreen()

    fireEvent.click(
      within(jobRolesSection()).getByRole('button', { name: JOB_ROLE.addLabel })
    )
    fireEvent.change(screen.getByLabelText(JOB_ROLE.nameLabel), {
      target: { value: 'Principal Engineer' },
    })
    fireEvent.submit(screen.getByTestId('jobRole-form'))
    await screen.findByText('Principal Engineer')

    render(
      <AddEmployeeModal
        employees={[BOB]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    )
    await screen.findByTestId('add-employee-form')

    const options = Array.from(
      screen.getByLabelText('Job role').querySelectorAll('option')
    ).map((option) => option.textContent)
    expect(options).toContain('Principal Engineer')
  })

  it('refuses a blank name without calling the API', async () => {
    await renderScreen()

    fireEvent.click(
      within(jobRolesSection()).getByRole('button', { name: JOB_ROLE.addLabel })
    )
    fireEvent.submit(screen.getByTestId('jobRole-form'))

    expect(
      await screen.findByText('Please enter a job role name')
    ).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
    ).toHaveLength(0)
  })

  it('refuses a name that duplicates an existing role', async () => {
    await renderScreen()

    fireEvent.click(
      within(jobRolesSection()).getByRole('button', { name: JOB_ROLE.addLabel })
    )
    fireEvent.change(screen.getByLabelText(JOB_ROLE.nameLabel), {
      target: { value: '  contractor  ' },
    })
    fireEvent.submit(screen.getByTestId('jobRole-form'))

    expect(
      await screen.findByText('That job role already exists')
    ).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
    ).toHaveLength(0)
  })
})

describe('deleting a job role', () => {
  async function openDelete(name: string) {
    fireEvent.click(
      within(cardFor(jobRolesSection(), name)).getByRole('button', {
        name: `Delete ${name}`,
      })
    )
    return screen.findByTestId('modal')
  }

  it('explains why a role somebody holds cannot be deleted', async () => {
    await renderScreen()
    const modal = await openDelete(CONTRACTOR.name)

    expect(within(modal).getByRole('alert')).toHaveTextContent(
      '2 people are assigned to Contractor, so it cannot be deleted. Move them to another job role first.'
    )
    expect(
      within(modal).queryByRole('button', { name: `Delete ${CONTRACTOR.name}` })
    ).not.toBeInTheDocument()
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')
    ).toHaveLength(0)
  })

  it('deletes a role nobody holds and drops it from the screen', async () => {
    await renderScreen()
    const modal = await openDelete(LEAD_ENGINEER.name)

    expect(within(modal).queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.click(
      within(modal).getByRole('button', {
        name: `Delete ${LEAD_ENGINEER.name}`,
      })
    )

    await waitFor(() =>
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    )
    await waitFor(() =>
      expect(
        within(jobRolesSection()).queryByText(LEAD_ENGINEER.name)
      ).not.toBeInTheDocument()
    )
    const deleted = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'DELETE'
    )
    expect(String(deleted?.[0])).toContain(`/api/job-roles/${LEAD_ENGINEER.id}`)
  })

  it('reads back the API refusal when the server rejects the delete', async () => {
    await renderScreen({
      status: 409,
      message: 'Cannot delete job role: one or more users are assigned to it',
    })
    const modal = await openDelete(LEAD_ENGINEER.name)

    fireEvent.click(
      within(modal).getByRole('button', {
        name: `Delete ${LEAD_ENGINEER.name}`,
      })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot delete job role: one or more users are assigned to it'
    )
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })
})

describe('the departments on the same screen', () => {
  it('lists each department with the number of people in it', async () => {
    await renderScreen()

    expect(
      within(cardFor(departmentsSection(), ENGINEERING.name)).getByTestId(
        'org-unit-user-count'
      )
    ).toHaveTextContent('50')
  })

  it('summarises both sections in their headings', async () => {
    await renderScreen()

    expect(
      within(departmentsSection()).getByText('2 departments • 50 people')
    ).toBeInTheDocument()
    expect(
      within(jobRolesSection()).getByText('2 job roles • 2 people')
    ).toBeInTheDocument()
  })

  it('explains why a department somebody is in cannot be deleted', async () => {
    await renderScreen()
    fireEvent.click(
      within(cardFor(departmentsSection(), ENGINEERING.name)).getByRole(
        'button',
        { name: `Delete ${ENGINEERING.name}` }
      )
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '50 people are in Engineering, so it cannot be deleted. Move them to another department first.'
    )
  })
})
