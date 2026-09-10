import { StatusCodes } from 'http-status-codes'
import { cached, clearApiCache } from '@/api/cache'
import { getStoredToken } from '@/api/token'

export const DEFAULT_API_BASE_URL = 'http://localhost:3000'

export function resolveApiBaseUrl(env: ImportMetaEnv): string {
  const configured = env.VITE_API_URL?.trim()
  return (configured || DEFAULT_API_BASE_URL).replace(/\/+$/, '')
}

const BASE_URL = resolveApiBaseUrl(import.meta.env)

export type ApiAction = 'read' | 'constructive' | 'destructive'

const GENERIC_MESSAGE = 'Something went wrong. Please try again.'

const RATE_LIMIT_MESSAGE =
  'Too many requests. Please wait a few minutes and try again.'

const SESSION_EXPIRED_MESSAGE =
  'Your session has expired. Please sign in again.'

const LOGIN_FAILED_MESSAGE =
  'We could not sign you in. Please check your email and password and try again.'

const CALLER_CANNOT_ANTICIPATE = [
  StatusCodes.UNAUTHORIZED,
  StatusCodes.TOO_MANY_REQUESTS,
]

export function apiErrorMessage(status: number): string {
  if (status === StatusCodes.UNAUTHORIZED) return SESSION_EXPIRED_MESSAGE
  if (status === StatusCodes.TOO_MANY_REQUESTS) return RATE_LIMIT_MESSAGE
  return GENERIC_MESSAGE
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly action: ApiAction
  readonly detail: string

  constructor(
    message: string,
    status: number,
    action: ApiAction = 'read',
    detail: string = message
  ) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.action = action
    this.detail = detail
  }
}

export function getApiErrorMessage(error: unknown, fallback?: string): string {
  if (error instanceof ApiRequestError) {
    return CALLER_CANNOT_ANTICIPATE.includes(error.status)
      ? error.message
      : (fallback ?? error.message)
  }
  return fallback ?? GENERIC_MESSAGE
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
  action: ApiAction,
  options: RequestInit = {}
): Promise<unknown> {
  const token = getStoredToken()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === StatusCodes.NO_CONTENT) return []

  const body =
    res.status === StatusCodes.TOO_MANY_REQUESTS
      ? null
      : await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiRequestError(
      apiErrorMessage(res.status),
      res.status,
      action,
      (body as { error?: string } | null)?.error ?? ''
    )
  }
  return body
}

async function send<T>(
  path: string,
  action: ApiAction,
  options: RequestInit = {}
): Promise<T> {
  return unwrapEnvelope<T>(await sendRaw(path, action, options))
}

export function get<T>(path: string): Promise<T> {
  return cached(path, () => send<T>(path, 'read'))
}

function mutate<T>(method: string, path: string, body?: unknown): Promise<T> {
  const action: ApiAction = method === 'DELETE' ? 'destructive' : 'constructive'
  return send<T>(path, action, {
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
  const raw = await sendRaw(path, 'constructive', {
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

  const text = await res.text()
  if (!res.ok) {
    let detail = ''
    try {
      detail = (JSON.parse(text) as { error?: string }).error ?? ''
    } catch {}
    throw new ApiRequestError(
      res.status === StatusCodes.TOO_MANY_REQUESTS
        ? RATE_LIMIT_MESSAGE
        : LOGIN_FAILED_MESSAGE,
      res.status,
      'constructive',
      detail
    )
  }
  return text
}
