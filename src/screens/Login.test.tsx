import { StatusCodes } from 'http-status-codes'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/lib/auth'
import { routes } from '@/routes'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Login', () => {
  it('shows a readable message when the rate limiter responds with 429', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: StatusCodes.TOO_MANY_REQUESTS,
        text: async () => 'Too many requests - try again later',
      }))
    )

    const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
    render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    )

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'alice.thompson@company.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Password123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'Too many requests. Please wait a few minutes and try again.'
    )
  })
})
