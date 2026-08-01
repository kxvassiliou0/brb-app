import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/lib/auth'
import { setStoredToken } from '@/lib/api'
import type { Role } from '@/lib/routeAccess'
import { makeUserJwt } from '@/test/jwt'
import { routes } from '@/routes'

function renderAt(path: string, role?: Role) {
  if (role) {
    setStoredToken(makeUserJwt({ id: 1, email: `${role.toLowerCase()}@company.com`, role }))
  }
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

const cases: { path: string; testId: string; role: Role }[] = [
  { path: '/admin', testId: 'screen-admin-dashboard', role: 'Admin' },
  { path: '/admin/employees', testId: 'screen-employees', role: 'Admin' },
  { path: '/admin/departments', testId: 'screen-departments', role: 'Admin' },
  { path: '/admin/requests', testId: 'screen-requests', role: 'Admin' },
  { path: '/admin/requests/new', testId: 'screen-create-request', role: 'Admin' },
  { path: '/admin/requests/42', testId: 'screen-request-review', role: 'Admin' },
  { path: '/admin/settings', testId: 'screen-settings', role: 'Admin' },
  { path: '/employee', testId: 'screen-employee-dashboard', role: 'Employee' },
  { path: '/employee/book-time-off', testId: 'screen-create-request', role: 'Employee' },
  { path: '/employee/my-requests', testId: 'screen-my-requests', role: 'Employee' },
  { path: '/employee/my-requests/new', testId: 'screen-create-request', role: 'Employee' },
  { path: '/employee/settings', testId: 'screen-settings', role: 'Employee' },
  { path: '/manager', testId: 'screen-manager-dashboard', role: 'Manager' },
  { path: '/manager/requests', testId: 'screen-requests', role: 'Manager' },
  { path: '/manager/requests/new', testId: 'screen-create-request', role: 'Manager' },
  { path: '/manager/requests/7', testId: 'screen-request-review', role: 'Manager' },
  { path: '/manager/team-calendar', testId: 'screen-team-calendar', role: 'Manager' },
  { path: '/manager/settings', testId: 'screen-settings', role: 'Manager' },
]

describe('routes', () => {
  it.each(cases)('mounts the correct screen for $path', async ({ path, testId, role }) => {
    renderAt(path, role)

    expect(await screen.findByTestId(testId)).toBeInTheDocument()
  })

  it('mounts the login screen at /login', async () => {
    renderAt('/login')

    expect(await screen.findByTestId('screen-login')).toBeInTheDocument()
  })

  it('redirects the bare root to /login', async () => {
    renderAt('/')

    expect(await screen.findByTestId('screen-login')).toBeInTheDocument()
  })

  it('renders the persistent sidebar alongside every dashboard screen', async () => {
    renderAt('/manager/team-calendar', 'Manager')

    expect(await screen.findByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('screen-team-calendar')).toBeInTheDocument()
  })
})
