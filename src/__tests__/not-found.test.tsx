import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth/auth'
import { setStoredToken } from '@/api/token'
import { makeUserJwt } from '@/test-support/jwt'
import { routes } from '@/routes'

beforeEach(() => {
  localStorage.clear()
})

describe('not found', () => {
  it.each(['/admin/this-does-not-exist', '/manager/this-does-not-exist'])(
    'renders the not-found screen for unmatched path %s',
    async (path) => {
      setStoredToken(
        makeUserJwt({ id: 1, email: 'admin@company.com', role: 'Admin' })
      )
      const router = createMemoryRouter(routes, { initialEntries: [path] })
      render(
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      )

      expect(await screen.findByTestId('not-found')).toBeInTheDocument()
    }
  )
})
