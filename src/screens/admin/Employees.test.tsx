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
import { HOME_PATH, type Role } from '@/lib/routeAccess'
import { routes } from '@/routes'
import { makeUserJwt } from '@/test/jwt'
import { desktopWidth, mobileWidth, setViewportWidth } from '@/test/viewport'
import { SELF_DELETE_MESSAGE } from '@/lib/employeeAdmin'
import type { UserListItem, UserRecord } from '@/types/api'
import Employees from './Employees'

const ALICE: UserListItem = {
  id: 1,
  firstName: 'Alice',
  lastName: 'Thompson',
  email: 'alice.thompson@company.com',
  role: 'Admin',
  annualLeaveAllowance: 25,
  department: { id: 2, name: 'Human Resources' },
  jobRole: { id: 3, name: 'HR Specialist' },
  manager: null,
}

const DAVID: UserListItem = {
  id: 4,
  firstName: 'David',
  lastName: 'Jones',
  email: 'david.jones@company.com',
  role: 'Employee',
  annualLeaveAllowance: 22,
  department: { id: 1, name: 'Engineering' },
  jobRole: { id: 5, name: 'Contractor' },
  manager: { id: 6, name: 'Bob Mitchell' },
}

const EMPLOYEES = [ALICE, DAVID]

const OTHER_ADMIN_ID = 99

function stubUsers(payload: unknown = EMPLOYEES): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: payload }),
    }))
  )
}

function signIn(id: number): void {
  setStoredToken(makeUserJwt({ id, email: 'admin@company.com', role: 'Admin' }))
}

async function renderScreen(
  payload: unknown = EMPLOYEES,
  signedInId: number = OTHER_ADMIN_ID
) {
  stubUsers(payload)
  signIn(signedInId)
  render(
    <AuthProvider>
      <Employees />
    </AuthProvider>
  )
  return screen.findByText(ALICE.email)
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the employee list', () => {
  it('lists every user with each expected column populated', async () => {
    setViewportWidth(desktopWidth())
    await renderScreen()

    const rows = within(screen.getByTestId('data-table')).getAllByRole('row')
    expect(rows).toHaveLength(EMPLOYEES.length + 1)

    const headers = within(rows[0]!).getAllByRole('columnheader')
    expect(headers.map((header) => header.textContent)).toEqual([
      'Employee name',
      'Email',
      'Department',
      'Job role',
      'Line manager',
      'Annual leave',
      'Actions',
    ])

    const david = within(rows[2]!)
      .getAllByRole('cell')
      .map((cell) => cell.textContent)
    expect(david[0]).toContain('David Jones')
    expect(david[1]).toContain('david.jones@company.com')
    expect(david[2]).toContain('Engineering')
    expect(david[3]).toContain('Contractor')
    expect(david[4]).toContain('Bob Mitchell')
    expect(david[5]).toContain('22 days')
  })

  it('offers an edit and a delete action named for the employee on every row', async () => {
    setViewportWidth(desktopWidth())
    await renderScreen()

    for (const employee of EMPLOYEES) {
      const name = `${employee.firstName} ${employee.lastName}`
      expect(
        screen.getByRole('button', { name: `Edit ${name}` })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: `Delete ${name}` })
      ).toBeInTheDocument()
    }
  })

  it('renders the department and job role names rather than their raw ids', async () => {
    setViewportWidth(desktopWidth())
    await renderScreen()

    const table = screen.getByTestId('data-table')
    expect(within(table).getByText('Human Resources')).toBeInTheDocument()
    expect(within(table).getByText('HR Specialist')).toBeInTheDocument()
    expect(within(table).getByText('Engineering')).toBeInTheDocument()
    expect(within(table).getByText('Contractor')).toBeInTheDocument()

    for (const raw of ['2', '3', '1', '5']) {
      expect(within(table).queryByText(raw)).not.toBeInTheDocument()
    }
  })

  it('names a missing line manager explicitly instead of leaving the cell blank', async () => {
    setViewportWidth(desktopWidth())
    await renderScreen()

    const [withoutManager, withManager] =
      screen.getAllByTestId('employee-manager')
    expect(withoutManager).toHaveTextContent('None')
    expect(withManager).toHaveTextContent('Bob Mitchell')
  })

  it('never renders a password or salt, even when the response carries them', async () => {
    setViewportWidth(desktopWidth())
    const leaky = [
      { ...ALICE, password: 'hashed-secret', salt: 'secret-salt' },
      { ...DAVID, password: 'another-secret', salt: 'another-salt' },
    ]
    await renderScreen(leaky)

    const rendered = screen.getByTestId('screen-employees').textContent ?? ''
    for (const secret of [
      'hashed-secret',
      'secret-salt',
      'another-secret',
      'another-salt',
    ]) {
      expect(rendered).not.toContain(secret)
    }
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/salt/i)).not.toBeInTheDocument()
  })

  it('summarises the roster in the page header', async () => {
    setViewportWidth(desktopWidth())
    await renderScreen()

    expect(
      screen.getByText('2 people across 2 departments')
    ).toBeInTheDocument()
  })
})

describe('the employee list below the mobile breakpoint', () => {
  it('collapses the table into one stacked card per employee', async () => {
    setViewportWidth(mobileWidth())
    await renderScreen()

    expect(screen.queryByTestId('data-table')).not.toBeInTheDocument()
    expect(screen.getByTestId('data-cards')).toBeInTheDocument()

    const cards = screen.getAllByTestId('data-card')
    expect(cards).toHaveLength(EMPLOYEES.length)

    const first = within(cards[0]!)
    expect(first.getByText('Employee name')).toBeInTheDocument()
    expect(first.getByTestId('employee-name')).toHaveTextContent(
      'Alice Thompson'
    )
    expect(first.getByText('Human Resources')).toBeInTheDocument()
    expect(first.getByTestId('employee-manager')).toHaveTextContent('None')
    expect(
      first.getByRole('button', { name: 'Edit Alice Thompson' })
    ).toBeInTheDocument()
  })
})

describe('deleting an employee from the list', () => {
  it('opens a confirmation naming that employee rather than deleting at once', async () => {
    setViewportWidth(desktopWidth())
    await renderScreen()

    fireEvent.click(screen.getByRole('button', { name: 'Delete David Jones' }))

    expect(
      await screen.findByRole('heading', { name: 'Delete David Jones?' })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Every leave request David Jones has made/)
    ).toBeInTheDocument()
  })

  it('refuses to let an Admin delete the account they are signed in as', async () => {
    setViewportWidth(desktopWidth())
    await renderScreen(EMPLOYEES, ALICE.id)

    const ownRow = screen.getByRole('button', {
      name: `Delete ${ALICE.firstName} ${ALICE.lastName} (${SELF_DELETE_MESSAGE})`,
    })
    expect(ownRow).toBeDisabled()
    expect(ownRow).toHaveAttribute('title', SELF_DELETE_MESSAGE)

    fireEvent.click(ownRow)
    expect(screen.queryByTestId('delete-confirmation')).not.toBeInTheDocument()
  })

  it('still allows the same Admin to delete anybody else', async () => {
    setViewportWidth(desktopWidth())
    await renderScreen(EMPLOYEES, ALICE.id)

    expect(
      screen.getByRole('button', { name: 'Delete David Jones' })
    ).toBeEnabled()
  })
})

describe('editing an employee from the list', () => {
  const DAVID_RECORD: UserRecord = {
    id: DAVID.id,
    firstName: DAVID.firstName,
    lastName: DAVID.lastName,
    email: DAVID.email,
    role: DAVID.role,
    annualLeaveAllowance: DAVID.annualLeaveAllowance,
    departmentId: DAVID.department.id,
    jobRoleId: DAVID.jobRole.id,
    managerId: DAVID.manager?.id ?? null,
  }

  function respond(body: unknown): Response {
    return {
      ok: true,
      status: 200,
      json: async () => body,
    } as unknown as Response
  }

  function stubEditFlow(afterSave: UserListItem[]): void {
    let listCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (init?.method === 'PATCH') return respond({ data: DAVID_RECORD })
        if (url.includes('/api/departments'))
          return respond({ data: [ALICE.department, DAVID.department] })
        if (url.includes('/api/job-roles'))
          return respond({ data: [ALICE.jobRole, DAVID.jobRole] })
        if (url.endsWith(`/api/users/${DAVID.id}`))
          return respond({ data: DAVID_RECORD })
        listCalls += 1
        return respond({ data: listCalls === 1 ? EMPLOYEES : afterSave })
      })
    )
  }

  async function openEditor(afterSave: UserListItem[]) {
    setViewportWidth(desktopWidth())
    stubEditFlow(afterSave)
    signIn(OTHER_ADMIN_ID)
    render(
      <AuthProvider>
        <Employees />
      </AuthProvider>
    )
    await screen.findByText(DAVID.email)
    fireEvent.click(screen.getByRole('button', { name: 'Edit David Jones' }))
    return screen.findByTestId('edit-employee-form')
  }

  it('opens the form pre-populated from the record', async () => {
    await openEditor(EMPLOYEES)

    expect(screen.getByLabelText('First name')).toHaveValue('David')
    expect(screen.getByLabelText('Email')).toHaveValue(DAVID.email)
    expect(screen.getByLabelText('New password')).toHaveValue('')
  })

  it('reflects a saved change in the list without tearing the page down', async () => {
    const updated = [ALICE, { ...DAVID, annualLeaveAllowance: 30 }]
    const form = await openEditor(updated)
    const screenNode = screen.getByTestId('screen-employees')

    fireEvent.change(screen.getByLabelText('Annual leave allowance (days)'), {
      target: { value: '30' },
    })
    fireEvent.submit(form)

    expect(await screen.findByText('30 days')).toBeInTheDocument()
    expect(screen.queryByTestId('edit-employee-form')).not.toBeInTheDocument()
    expect(screen.getByTestId('screen-employees')).toBe(screenNode)
  })
})

describe('access to the employee list', () => {
  function renderAt(role: Role) {
    setStoredToken(
      makeUserJwt({ id: 1, email: `${role.toLowerCase()}@company.com`, role })
    )
    const router = createMemoryRouter(routes, {
      initialEntries: ['/employees'],
    })
    render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    )
    return router
  }

  it.each<Role>(['Manager', 'Employee'])(
    'refuses to render the screen for a %s',
    async (role) => {
      stubUsers()
      const router = renderAt(role)

      await screen.findByTestId('app-layout')
      await waitFor(() =>
        expect(router.state.location.pathname).toBe(HOME_PATH)
      )
      expect(screen.queryByTestId('screen-employees')).not.toBeInTheDocument()
    }
  )

  it('renders the screen for an Admin', async () => {
    stubUsers()
    renderAt('Admin')

    expect(await screen.findByTestId('screen-employees')).toBeInTheDocument()
  })
})
