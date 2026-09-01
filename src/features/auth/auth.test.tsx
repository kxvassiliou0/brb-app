import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeExpiredUserJwt, makeJwt, makeUserJwt } from '@/test-support/jwt'
import { AuthProvider, isTokenExpired, useAuth } from '@/features/auth/auth'
import { setStoredToken } from '@/api/token'

function Probe() {
  const { user } = useAuth()
  return <div data-testid="probe">{user ? JSON.stringify(user) : 'null'}</div>
}

beforeEach(() => {
  localStorage.clear()
})

describe('decodeUser (via AuthProvider)', () => {
  it('reads the user from the nested token object', () => {
    const jwt = makeUserJwt({ id: 1, email: 'a@company.com', role: 'Admin' })
    setStoredToken(jwt)

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    expect(screen.getByTestId('probe')).toHaveTextContent(
      JSON.stringify({ id: 1, email: 'a@company.com', role: 'Admin' })
    )
  })

  it('ignores a same-shaped payload placed at the root instead of nested under token', () => {
    const jwt = makeJwt({ id: 1, email: 'a@company.com', role: 'Admin' })
    setStoredToken(jwt)

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    expect(screen.getByTestId('probe')).toHaveTextContent('null')
  })
})

describe('isTokenExpired', () => {
  it('returns false for a token with a future exp', () => {
    const jwt = makeUserJwt({ id: 1, email: 'a@company.com', role: 'Admin' })
    expect(isTokenExpired(jwt)).toBe(false)
  })

  it('returns true for a token with a past exp', () => {
    const jwt = makeExpiredUserJwt({
      id: 1,
      email: 'a@company.com',
      role: 'Admin',
    })
    expect(isTokenExpired(jwt)).toBe(true)
  })

  it('returns true for a malformed token', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(true)
  })
})
