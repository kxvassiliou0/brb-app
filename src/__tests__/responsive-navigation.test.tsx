import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/auth'
import { setStoredToken } from '@/api/token'
import { NAV_BREAKPOINT } from '@/lib/breakpoints'
import type { Role } from '@/lib/routeAccess'
import { makeUserJwt } from '@/test-support/jwt'
import {
  desktopWidth,
  mobileWidth,
  setViewportWidth,
} from '@/test-support/viewport'
import { routes } from '@/routes'

const DESKTOP = desktopWidth(NAV_BREAKPOINT)
const MOBILE = mobileWidth(NAV_BREAKPOINT)

function renderAt(path: string, role: Role) {
  setStoredToken(
    makeUserJwt({ id: 1, email: `${role.toLowerCase()}@company.com`, role })
  )
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    }))
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('navigation at the nav breakpoint and above', () => {
  it('renders a sidebar and no bottom bar', () => {
    setViewportWidth(DESKTOP)
    renderAt('/', 'Employee')

    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.queryByTestId('bottom-nav')).not.toBeInTheDocument()
  })

  it('labels sidebar links with their full names', () => {
    setViewportWidth(DESKTOP)
    renderAt('/', 'Manager')

    const links = within(screen.getByTestId('sidebar')).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual([
      'Dashboard',
      'Requests',
      'Team calendar',
      'Settings',
    ])
  })
})

describe('navigation below the nav breakpoint', () => {
  it('renders a bottom bar and no sidebar', () => {
    setViewportWidth(MOBILE)
    renderAt('/', 'Employee')

    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument()
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
  })

  it('keeps every destination reachable from the bottom bar', () => {
    setViewportWidth(MOBILE)
    renderAt('/', 'Manager')

    const links = within(screen.getByTestId('bottom-nav')).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/',
      '/requests',
      '/team-calendar',
      '/settings',
    ])
  })

  it('marks the current destination on both forms', () => {
    setViewportWidth(MOBILE)
    renderAt('/departments', 'Admin')

    const current = within(screen.getByTestId('bottom-nav')).getByRole('link', {
      current: 'page',
    })
    expect(current).toHaveAttribute('href', '/departments')
  })
})

describe('navigation when the viewport crosses the nav breakpoint', () => {
  it('swaps between a sidebar and a bottom bar', () => {
    setViewportWidth(DESKTOP)
    renderAt('/', 'Admin')
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()

    act(() => setViewportWidth(MOBILE))
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument()

    act(() => setViewportWidth(DESKTOP))
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.queryByTestId('bottom-nav')).not.toBeInTheDocument()
  })

  it('exposes exactly one main navigation landmark at either width', () => {
    setViewportWidth(DESKTOP)
    renderAt('/', 'Admin')
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1)

    act(() => setViewportWidth(MOBILE))
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1)
  })
})

describe('following a sidebar link', () => {
  it('moves the current-page marker onto the destination', async () => {
    setViewportWidth(DESKTOP)
    renderAt('/', 'Admin')

    const sidebar = within(screen.getByTestId('sidebar'))
    expect(sidebar.getByRole('link', { current: 'page' })).toHaveAttribute(
      'href',
      '/'
    )

    fireEvent.click(sidebar.getByRole('link', { name: 'Employees' }))

    await waitFor(() =>
      expect(
        within(screen.getByTestId('sidebar')).getByRole('link', {
          current: 'page',
        })
      ).toHaveAttribute('href', '/employees')
    )
    expect(screen.getByTestId('screen-employees')).toBeInTheDocument()
  })
})
