export const DEFAULT_API_BASE_URL = 'http://localhost:3000'

export function resolveApiBaseUrl(env: ImportMetaEnv): string {
  const configured = env.VITE_API_URL?.trim()
  return (configured || DEFAULT_API_BASE_URL).replace(/\/+$/, '')
}

const API_BASE_URL = resolveApiBaseUrl(import.meta.env)
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

export class ApiRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

export const DEFAULT_API_ERROR_MESSAGE =
  'Something went wrong. Please try again.'

export function getApiErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_API_ERROR_MESSAGE
): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
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
    throw new ApiRequestError(RATE_LIMIT_MESSAGE, res.status)
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiRequestError(
      body?.error ?? `Request failed with status ${res.status}`,
      res.status
    )
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
