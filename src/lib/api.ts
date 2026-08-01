const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TOKEN_KEY = 'lbs_token'
export const HTTP_TOO_MANY_REQUESTS = 429
const RATE_LIMIT_MESSAGE =
  'Too many requests. Please wait a few minutes and try again.'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  if (res.status === HTTP_TOO_MANY_REQUESTS) {
    throw new Error(RATE_LIMIT_MESSAGE)
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed with status ${res.status}`)
  }
  return body as T
}

export async function loginRequest(
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (res.status === HTTP_TOO_MANY_REQUESTS) {
    throw new Error(RATE_LIMIT_MESSAGE)
  }
  const text = await res.text()
  if (!res.ok) {
    let message = 'Login failed'
    try {
      message = JSON.parse(text).error ?? message
    } catch {}
    throw new Error(message)
  }
  return text
}
