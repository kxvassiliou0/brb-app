import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../lib/auth'
import { routes } from '../routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

const cases: { path: string; testId: string }[] = [
  { path: '/login', testId: 'screen-login' },
  { path: '/admin', testId: 'screen-admin-dashboard' },
  { path: '/admin/employees', testId: 'screen-employees' },
  { path: '/admin/departments', testId: 'screen-departments' },
  { path: '/admin/requests', testId: 'screen-requests' },
  { path: '/admin/requests/new', testId: 'screen-create-request' },
  { path: '/admin/requests/42', testId: 'screen-request-review' },
  { path: '/admin/settings', testId: 'screen-settings' },
  { path: '/employee', testId: 'screen-employee-dashboard' },
  { path: '/employee/book-time-off', testId: 'screen-create-request' },
  { path: '/employee/my-requests', testId: 'screen-my-requests' },
  { path: '/employee/my-requests/new', testId: 'screen-create-request' },
  { path: '/employee/settings', testId: 'screen-settings' },
  { path: '/manager', testId: 'screen-manager-dashboard' },
  { path: '/manager/requests', testId: 'screen-requests' },
  { path: '/manager/requests/new', testId: 'screen-create-request' },
  { path: '/manager/requests/7', testId: 'screen-request-review' },
  { path: '/manager/team-calendar', testId: 'screen-team-calendar' },
  { path: '/manager/settings', testId: 'screen-settings' },
]

describe('routes', () => {
  it.each(cases)('mounts the correct screen for $path', async ({ path, testId }) => {
    renderAt(path)

    expect(await screen.findByTestId(testId)).toBeInTheDocument()
  })

  it('redirects the bare root to /login', async () => {
    renderAt('/')

    expect(await screen.findByTestId('screen-login')).toBeInTheDocument()
  })

  it('renders the persistent sidebar alongside every dashboard screen', async () => {
    renderAt('/manager/team-calendar')

    expect(await screen.findByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('screen-team-calendar')).toBeInTheDocument()
  })
})
