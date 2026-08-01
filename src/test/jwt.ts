const MS_PER_SECOND = 1000
const MS_PER_HOUR = 60 * 60 * MS_PER_SECOND
const DEFAULT_TOKEN_LIFETIME_MS = 3 * MS_PER_HOUR

function base64url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function makeJwt(payload: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  return `${header}.${body}.signature`
}

type JwtUser = {
  id: number
  email: string
  role: 'Admin' | 'Manager' | 'Employee'
}

export function makeUserJwt(
  user: JwtUser,
  expiresInMs: number = DEFAULT_TOKEN_LIFETIME_MS
): string {
  return makeJwt({
    token: user,
    exp: Math.floor((Date.now() + expiresInMs) / MS_PER_SECOND),
  })
}

export function makeExpiredUserJwt(user: JwtUser): string {
  return makeUserJwt(user, -MS_PER_SECOND)
}
