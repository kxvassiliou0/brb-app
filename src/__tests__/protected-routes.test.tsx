import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/lib/auth'
import { getStoredToken, setStoredToken } from '@/lib/api'
import { ROLE_HOME, type Role } from '@/lib/routeAccess'
import { makeExpiredUserJwt, makeUserJwt } from '@/test/jwt'
import { routes } from '@/routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
  return router
}

function seedUser(role: Role) {
  setStoredToken(
    makeUserJwt({ id: 1, email: `${role.toLowerCase()}@company.com`, role })
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const allowedPaths: Record<Role, { path: string; testId: string }[]> = {
  Admin: [
    { path: '/admin', testId: 'screen-admin-dashboard' },
    { path: '/admin/employees', testId: 'screen-employees' },
    { path: '/admin/departments', testId: 'screen-departments' },
  ],
  Manager: [
    { path: '/manager', testId: 'screen-manager-dashboard' },
    { path: '/manager/requests', testId: 'screen-requests' },
    { path: '/manager/team-calendar', testId: 'screen-team-calendar' },
  ],
  Employee: [
    { path: '/employee', testId: 'screen-employee-dashboard' },
    { path: '/employee/book-time-off', testId: 'screen-create-request' },
    { path: '/employee/my-requests', testId: 'screen-my-requests' },
  ],
}

const disallowedPaths: Record<Role, string[]> = {
  Admin: ['/employee', '/employee/my-requests'],
  Manager: ['/admin', '/admin/employees', '/employee', '/employee/my-requests'],
  Employee: [
    '/admin',
    '/admin/employees',
    '/manager',
    '/manager/team-calendar',
  ],
}

describe('role-scoped route access', () => {
  for (const role of Object.keys(allowedPaths) as Role[]) {
    for (const { path, testId } of allowedPaths[role]) {
      it(`${role} can reach ${path}`, async () => {
        seedUser(role)
        renderAt(path)

        expect(await screen.findByTestId(testId)).toBeInTheDocument()
      })
    }

    for (const path of disallowedPaths[role]) {
      it(`${role} is refused ${path}`, async () => {
        seedUser(role)
        const router = renderAt(path)

        await screen.findByTestId('app-layout')
        expect(router.state.location.pathname).toBe(ROLE_HOME[role])
      })
    }
  }
})

describe('cross-role allowances that mirror the backend', () => {
  it('lets an Admin reach Manager-or-Admin routes', async () => {
    seedUser('Admin')
    renderAt('/manager/team-calendar')

    expect(
      await screen.findByTestId('screen-team-calendar')
    ).toBeInTheDocument()
  })
})

describe('unauthenticated access', () => {
  it('redirects to /login', async () => {
    renderAt('/manager/team-calendar')

    expect(await screen.findByTestId('screen-login')).toBeInTheDocument()
  })
})

describe('expired token', () => {
  it('logs out and redirects to /login', async () => {
    setStoredToken(
      makeExpiredUserJwt({ id: 1, email: 'admin@company.com', role: 'Admin' })
    )
    renderAt('/admin')

    expect(await screen.findByTestId('screen-login')).toBeInTheDocument()
    expect(getStoredToken()).toBeNull()
  })
})

describe('post-login redirect preservation', () => {
  it('returns to the originally requested page after login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          makeUserJwt({ id: 1, email: 'manager@company.com', role: 'Manager' }),
      }))
    )

    const router = renderAt('/manager/team-calendar')
    expect(await screen.findByTestId('screen-login')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'manager@company.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Password123!' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    })

    expect(
      await screen.findByTestId('screen-team-calendar')
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/manager/team-calendar')
  })
})
