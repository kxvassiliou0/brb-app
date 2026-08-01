import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/lib/auth'
import { setStoredToken } from '@/lib/api'
import { makeUserJwt } from '@/test/jwt'
import { routes } from '@/routes'

beforeEach(() => {
  localStorage.clear()
})

describe('layout persistence', () => {
  it('does not remount the shell when navigating between sibling screens', async () => {
    setStoredToken(makeUserJwt({ id: 1, email: 'admin@company.com', role: 'Admin' }))
    const router = createMemoryRouter(routes, { initialEntries: ['/admin'] })
    render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    )

    const layoutBefore = await screen.findByTestId('app-layout')

    await act(async () => {
      await router.navigate('/admin/employees')
    })

    const layoutAfter = screen.getByTestId('app-layout')
    expect(layoutAfter).toBe(layoutBefore)
    expect(screen.getByTestId('screen-employees')).toBeInTheDocument()
  })
})
