import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StatusCodes } from 'http-status-codes'
import { clearApiCache } from '@/api/cache'
import { setStoredToken } from '@/api/token'
import { DEFAULT_API_BASE_URL, get, post, resolveApiBaseUrl } from './client'

function envWith(url: string | undefined): ImportMetaEnv {
  return { VITE_API_URL: url } as ImportMetaEnv
}

async function importClientWith(url: string) {
  vi.resetModules()
  vi.stubEnv('VITE_API_URL', url)
  return import('./client')
}

function respond(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    json: async () => body,
  } as unknown as Response
}

const fetchMock = vi.fn()

beforeEach(() => {
  localStorage.clear()
  clearApiCache()
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(respond({ data: [] }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('resolveApiBaseUrl', () => {
  it('reads the base URL from VITE_API_URL', () => {
    expect(resolveApiBaseUrl(envWith('https://api.example.test'))).toBe(
      'https://api.example.test'
    )
  })

  it('trims trailing slashes so paths join cleanly', () => {
    expect(resolveApiBaseUrl(envWith('http://localhost:3000/'))).toBe(
      'http://localhost:3000'
    )
  })

  it('falls back to the local backend on port 3000', () => {
    expect(resolveApiBaseUrl(envWith(undefined))).toBe(DEFAULT_API_BASE_URL)
    expect(DEFAULT_API_BASE_URL).toBe('http://localhost:3000')
  })
})

describe('the base URL requests are sent to', () => {
  it('requests against the configured environment base URL', async () => {
    const client = await importClientWith('https://staging.example.test')
    await client.get('/api/leave-requests')
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://staging.example.test/api/leave-requests'
    )
  })
})

describe('what the client does with a response', () => {
  it('unwraps the data envelope so callers never see it', async () => {
    fetchMock.mockResolvedValue(respond({ data: [{ id: 1 }] }))

    expect(await get('/api/job-roles')).toEqual([{ id: 1 }])
  })

  it('reads an empty collection out of a 204 rather than stalling', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: StatusCodes.NO_CONTENT,
      json: async () => {
        throw new Error('no body')
      },
    } as unknown as Response)

    expect(await get('/api/job-roles')).toEqual([])
  })

  it('raises the API error message with its status', async () => {
    fetchMock.mockResolvedValue(
      respond({ error: 'Job role not found' }, StatusCodes.NOT_FOUND)
    )

    await expect(get('/api/job-roles/9')).rejects.toThrow('Job role not found')
    await expect(get('/api/job-roles/9')).rejects.toMatchObject({
      status: StatusCodes.NOT_FOUND,
    })
  })

  it('explains a rate limit in its own words', async () => {
    fetchMock.mockResolvedValue(respond(null, StatusCodes.TOO_MANY_REQUESTS))

    await expect(get('/api/users')).rejects.toThrow(/Too many requests/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('the request the client sends', () => {
  it('attaches the stored token as a bearer credential', async () => {
    setStoredToken('a-token')
    await get('/api/users')

    const headers = new Headers(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).headers
    )
    expect(headers.get('Authorization')).toBe('Bearer a-token')
  })

  it('sends no credential when nobody is signed in', async () => {
    await get('/api/users')

    const headers = new Headers(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).headers
    )
    expect(headers.has('Authorization')).toBe(false)
  })
})

describe('caching and invalidation', () => {
  it('serves a repeated read from cache instead of the network', async () => {
    await get('/api/job-roles')
    await get('/api/job-roles')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('invalidates the cache after a write so reads see the change', async () => {
    await get('/api/job-roles')
    await post('/api/job-roles', { name: 'Lead' })
    await get('/api/job-roles')

    const reads = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === undefined
    )
    expect(reads).toHaveLength(2)
  })
})
