import { setStoredToken } from '@/lib/api'
import { AuthProvider } from '@/lib/auth'
import type { Role } from '@/lib/routeAccess'
import { routes } from '@/routes'
import { makeUserJwt } from '@/test/jwt'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

function renderAt(path: string, role?: Role) {
  if (role) {
    setStoredToken(
      makeUserJwt({ id: 1, email: `${role.toLowerCase()}@company.com`, role })
    )
  }
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
})

const cases: { path: string; testId: string; role: Role }[] = [
  { path: '/', testId: 'screen-admin-dashboard', role: 'Admin' },
  { path: '/', testId: 'screen-manager-dashboard', role: 'Manager' },
  { path: '/', testId: 'screen-employee-dashboard', role: 'Employee' },
  { path: '/requests', testId: 'screen-requests', role: 'Admin' },
  { path: '/requests', testId: 'screen-requests', role: 'Manager' },
  { path: '/requests', testId: 'screen-requests', role: 'Employee' },
  { path: '/settings', testId: 'screen-settings', role: 'Admin' },
  { path: '/settings', testId: 'screen-settings', role: 'Manager' },
  { path: '/settings', testId: 'screen-settings', role: 'Employee' },
  { path: '/employees', testId: 'screen-employees', role: 'Admin' },
  { path: '/departments', testId: 'screen-departments', role: 'Admin' },
  { path: '/team-calendar', testId: 'screen-team-calendar', role: 'Manager' },
]

describe('routes', () => {
  it.each(cases)(
    'mounts the correct screen for $path as $role',
    async ({ path, testId, role }) => {
      renderAt(path, role)

      expect(await screen.findByTestId(testId)).toBeInTheDocument()
    }
  )

  it('mounts the login screen at /login', async () => {
    renderAt('/login')

    expect(await screen.findByTestId('screen-login')).toBeInTheDocument()
  })

  it('sends an unauthenticated visitor from the root to /login', async () => {
    renderAt('/')

    expect(await screen.findByTestId('screen-login')).toBeInTheDocument()
  })

  it('renders the persistent sidebar alongside every dashboard screen', async () => {
    renderAt('/team-calendar', 'Manager')

    expect(await screen.findByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('screen-team-calendar')).toBeInTheDocument()
  })
})
