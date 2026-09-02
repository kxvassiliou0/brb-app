import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/auth'
import { setStoredToken } from '@/api/token'
import { NAV_BREAKPOINT } from '@/lib/breakpoints'
import type { Role } from '@/lib/routeAccess'
import { makeUserJwt } from '@/test-support/jwt'
import { css, remToPx, sizeTokens } from '@/test-support/tokens'
import {
  desktopWidth,
  mobileWidth,
  setViewportWidth,
} from '@/test-support/viewport'
import { routes } from '@/routes'

const WCAG_258_MINIMUM_PX = 24

const INTERACTIVE = 'a, button, input, select, textarea, [role="button"]'

const TOUCH_TARGET_CLASS = 'touch-target'

const WIDTHS: [string, number][] = [
  ['mobile', mobileWidth(NAV_BREAKPOINT)],
  ['desktop', desktopWidth(NAV_BREAKPOINT)],
]

const SCREENS: { path: string; role: Role; testId: string }[] = [
  { path: '/', role: 'Admin', testId: 'screen-admin-dashboard' },
  { path: '/requests', role: 'Admin', testId: 'screen-requests' },
  { path: '/employees', role: 'Admin', testId: 'screen-employees' },
  { path: '/departments', role: 'Admin', testId: 'screen-departments' },
  { path: '/settings', role: 'Admin', testId: 'screen-settings' },
  { path: '/', role: 'Manager', testId: 'screen-manager-dashboard' },
  { path: '/requests', role: 'Manager', testId: 'screen-requests' },
  { path: '/team-calendar', role: 'Manager', testId: 'screen-team-calendar' },
  { path: '/', role: 'Employee', testId: 'screen-employee-dashboard' },
  { path: '/requests', role: 'Employee', testId: 'screen-requests' },
  { path: '/nowhere', role: 'Employee', testId: 'not-found' },
]

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

function describeTarget(element: Element): string {
  const text = element.textContent?.trim().slice(0, 30)
  return `<${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}>${text ? ` "${text}"` : ''}`
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  localStorage.clear()
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: [] }),
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('WCAG 2.5.8 target size', () => {
  it('sizes the touch-target token at or above the 24px minimum', () => {
    const token = sizeTokens[TOUCH_TARGET_CLASS]
    expect(token).toBeDefined()
    expect(remToPx(token!)).toBeGreaterThanOrEqual(WCAG_258_MINIMUM_PX)
  })

  it('applies the token in both axes so the minimum holds as a square', () => {
    const rule = css.match(/@utility touch-target\s*\{([^}]*)\}/)?.[1]
    expect(rule).toContain('min-block-size: var(--size-touch-target)')
    expect(rule).toContain('min-inline-size: var(--size-touch-target)')
  })

  it('meets the minimum on every screen at every width', async () => {
    for (const [label, width] of WIDTHS) {
      for (const { path, role } of SCREENS) {
        setViewportWidth(width)
        const { container, unmount } = renderAt(path, role)
        await screen.findByTestId('app-layout').catch(() => null)

        const targets = Array.from(container.querySelectorAll(INTERACTIVE))
        expect(targets.length, `${path} at ${label}`).toBeGreaterThan(0)

        const undersized = targets
          .filter((el) => !el.classList.contains(TOUCH_TARGET_CLASS))
          .map(describeTarget)
        expect(undersized, `${path} at ${label}`).toEqual([])
        unmount()
      }
    }
  })
})
