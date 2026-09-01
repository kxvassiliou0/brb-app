import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/auth'
import { getStoredToken, setStoredToken } from '@/api/token'
import { HOME_PATH, type Role } from '@/lib/routeAccess'
import { makeExpiredUserJwt, makeUserJwt } from '@/test-support/jwt'
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
    { path: '/', testId: 'screen-admin-dashboard' },
    { path: '/requests', testId: 'screen-requests' },
    { path: '/employees', testId: 'screen-employees' },
    { path: '/departments', testId: 'screen-departments' },
  ],
  Manager: [
    { path: '/', testId: 'screen-manager-dashboard' },
    { path: '/requests', testId: 'screen-requests' },
    { path: '/team-calendar', testId: 'screen-team-calendar' },
  ],
  Employee: [
    { path: '/', testId: 'screen-employee-dashboard' },
    { path: '/requests', testId: 'screen-requests' },
    { path: '/settings', testId: 'screen-settings' },
  ],
}

const disallowedPaths: Record<Role, string[]> = {
  Admin: [],
  Manager: ['/employees', '/departments'],
  Employee: ['/employees', '/departments', '/team-calendar'],
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
        expect(router.state.location.pathname).toBe(HOME_PATH)
      })
    }
  }
})

describe('cross-role allowances that mirror the backend', () => {
  it('lets an Admin reach the team calendar', async () => {
    seedUser('Admin')
    renderAt('/team-calendar')

    expect(
      await screen.findByTestId('screen-team-calendar')
    ).toBeInTheDocument()
  })
})

describe('unauthenticated access', () => {
  it('redirects to /login', async () => {
    renderAt('/team-calendar')

    expect(await screen.findByTestId('screen-login')).toBeInTheDocument()
  })
})

describe('expired token', () => {
  it('logs out and redirects to /login', async () => {
    setStoredToken(
      makeExpiredUserJwt({ id: 1, email: 'admin@company.com', role: 'Admin' })
    )
    renderAt('/')

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

    const router = renderAt('/team-calendar')
    expect(await screen.findByTestId('screen-login')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Email address'), {
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
    expect(router.state.location.pathname).toBe('/team-calendar')
  })
})
