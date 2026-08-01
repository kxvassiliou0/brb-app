import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../lib/auth'
import { routes } from '../routes'

describe('not found', () => {
  it.each(['/this-does-not-exist', '/admin/this-does-not-exist', '/manager/this-does-not-exist'])(
    'renders the not-found screen for unmatched path %s',
    async (path) => {
      const router = createMemoryRouter(routes, { initialEntries: [path] })
      render(
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>,
      )

      expect(await screen.findByTestId('not-found')).toBeInTheDocument()
    },
  )
})
