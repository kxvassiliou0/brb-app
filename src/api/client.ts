import { StatusCodes } from 'http-status-codes'
import { cached, clearApiCache } from '@/api/cache'
import { getStoredToken } from '@/api/token'

export const DEFAULT_API_BASE_URL = 'http://localhost:3000'

export function resolveApiBaseUrl(env: ImportMetaEnv): string {
  const configured = env.VITE_API_URL?.trim()
  return (configured || DEFAULT_API_BASE_URL).replace(/\/+$/, '')
}

const BASE_URL = resolveApiBaseUrl(import.meta.env)

const RATE_LIMIT_MESSAGE =
  'Too many requests. Please wait a few minutes and try again.'

export class ApiRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}

function unwrapEnvelope<T>(body: unknown): T {
  if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    const envelope = body as Record<string, unknown>
    if ('data' in envelope) return envelope.data as T
  }
  return body as T
}

async function sendRaw(
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  const token = getStoredToken()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === StatusCodes.TOO_MANY_REQUESTS) {
    throw new ApiRequestError(RATE_LIMIT_MESSAGE, res.status)
  }
  if (res.status === StatusCodes.NO_CONTENT) return []

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error
    throw new ApiRequestError(
      message ?? `Request failed with status ${res.status}`,
      res.status
    )
  }
  return body
}

async function send<T>(path: string, options: RequestInit = {}): Promise<T> {
  return unwrapEnvelope<T>(await sendRaw(path, options))
}

export function get<T>(path: string): Promise<T> {
  return cached(path, () => send<T>(path))
}

function mutate<T>(method: string, path: string, body?: unknown): Promise<T> {
  return send<T>(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }).then((result) => {
    clearApiCache()
    return result
  })
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return mutate<T>('POST', path, body)
}

export function patch<T>(path: string, body?: unknown): Promise<T> {
  return mutate<T>('PATCH', path, body)
}

export function remove<T>(path: string, body?: unknown): Promise<T> {
  return mutate<T>('DELETE', path, body)
}

interface Envelope<T> {
  data: T
  message?: string
}

export async function postWithMessage<T>(
  path: string,
  body: unknown
): Promise<Envelope<T>> {
  const raw = await sendRaw(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  clearApiCache()
  const envelope = (raw ?? {}) as Partial<Envelope<T>>
  return { data: envelope.data as T, message: envelope.message }
}

export async function postForToken(
  path: string,
  body: unknown
): Promise<string> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (res.status === StatusCodes.TOO_MANY_REQUESTS) {
    throw new ApiRequestError(RATE_LIMIT_MESSAGE, res.status)
  }

  const text = await res.text()
  if (!res.ok) {
    let message = 'Login failed'
    try {
      message = (JSON.parse(text) as { error?: string }).error ?? message
    } catch {}
    throw new ApiRequestError(message, res.status)
  }
  return text
}
