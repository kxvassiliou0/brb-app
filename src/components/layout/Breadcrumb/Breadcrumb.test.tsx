import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setStoredToken } from '@/api/token'
import { AuthProvider } from '@/features/auth/auth'
import { routes } from '@/routes'
import { makeUserJwt } from '@/test-support/jwt'

function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
        }) as unknown as Response
    )
  )
}

function renderAt(initialEntries: string[]) {
  setStoredToken(
    makeUserJwt({ id: 1, email: 'alice@company.com', role: 'Admin' })
  )
  const router = createMemoryRouter(routes, {
    initialEntries,
    initialIndex: initialEntries.length - 1,
  })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
  return router
}

beforeEach(() => {
  localStorage.clear()
  stubApi()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function trail(): string[] {
  return within(screen.getByTestId('breadcrumb'))
    .getAllByRole('listitem')
    .map((item) => item.textContent?.replace(/^\//, '').trim() ?? '')
}

describe('the breadcrumb trail', () => {
  it('shows the dashboard as Overview alone, with no parent above it', async () => {
    renderAt(['/'])
    await screen.findByTestId('screen-admin-dashboard')

    expect(trail()).toEqual(['Overview'])
    expect(
      within(screen.getByTestId('breadcrumb')).queryByText('Dashboard')
    ).not.toBeInTheDocument()
  })

  it('roots a directly opened page under Overview', async () => {
    renderAt(['/requests'])
    await screen.findByTestId('screen-requests')

    expect(trail()).toEqual(['Overview', 'Requests'])
    expect(screen.getByTestId('breadcrumb-ancestor')).toHaveAttribute(
      'href',
      '/'
    )
  })

  it('grows a step for each page you visit', async () => {
    const router = renderAt(['/'])
    await screen.findByTestId('screen-admin-dashboard')

    await router.navigate('/requests')
    await screen.findByTestId('screen-requests')
    await router.navigate('/departments')
    await screen.findByTestId('screen-departments')

    expect(trail()).toEqual(['Overview', 'Requests', 'Departments'])
  })

  it('lets you click an ancestor to go back to it', async () => {
    const router = renderAt(['/'])
    await screen.findByTestId('screen-admin-dashboard')

    await router.navigate('/requests')
    await screen.findByTestId('screen-requests')
    await router.navigate('/departments')
    await screen.findByTestId('screen-departments')

    const ancestors = screen.getAllByTestId('breadcrumb-ancestor')
    expect(ancestors.map((a) => a.getAttribute('href'))).toEqual([
      '/',
      '/requests',
    ])
  })

  it('truncates rather than repeating when you return to a page already in the trail', async () => {
    const router = renderAt(['/'])
    await screen.findByTestId('screen-admin-dashboard')

    await router.navigate('/requests')
    await screen.findByTestId('screen-requests')
    await router.navigate('/departments')
    await screen.findByTestId('screen-departments')
    await router.navigate('/requests')
    await screen.findByTestId('screen-requests')

    expect(trail()).toEqual(['Overview', 'Requests'])
  })

  it('marks the page you are on as the current one', async () => {
    const router = renderAt(['/'])
    await screen.findByTestId('screen-admin-dashboard')

    await router.navigate('/employees')
    await screen.findByTestId('screen-employees')

    expect(screen.getByTestId('breadcrumb-current')).toHaveTextContent(
      'Employees'
    )
  })
})
