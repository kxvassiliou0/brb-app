import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_API_BASE_URL, resolveApiBaseUrl } from './api'

function envWith(url: string | undefined): ImportMetaEnv {
  return { VITE_API_URL: url } as ImportMetaEnv
}

async function importApiWith(url: string | undefined) {
  vi.resetModules()
  if (url === undefined) vi.stubEnv('VITE_API_URL', '')
  else vi.stubEnv('VITE_API_URL', url)
  return import('./api')
}

function jsonResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: [] }),
  } as unknown as Response
}

describe('resolveApiBaseUrl', () => {
  it('reads the base URL from VITE_API_URL', () => {
    expect(resolveApiBaseUrl(envWith('https://api.example.test'))).toBe(
      'https://api.example.test'
    )
  })

  it('tracks the environment rather than returning a fixed string', () => {
    const first = resolveApiBaseUrl(envWith('https://one.example.test'))
    const second = resolveApiBaseUrl(envWith('https://two.example.test'))
    expect(first).not.toBe(second)
    expect(first).toBe('https://one.example.test')
    expect(second).toBe('https://two.example.test')
  })

  it('trims trailing slashes so paths join cleanly', () => {
    expect(resolveApiBaseUrl(envWith('http://localhost:3000/'))).toBe(
      'http://localhost:3000'
    )
  })

  it('falls back to the local Express backend on port 3000', () => {
    expect(resolveApiBaseUrl(envWith(undefined))).toBe('http://localhost:3000')
    expect(DEFAULT_API_BASE_URL).toBe('http://localhost:3000')
  })
})

describe('apiFetch base URL', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(jsonResponse())
    vi.stubGlobal('fetch', fetchMock)
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('requests against the configured environment base URL', async () => {
    const { apiFetch } = await importApiWith('https://staging.example.test')
    await apiFetch('/api/leave-requests')
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://staging.example.test/api/leave-requests'
    )
  })

  it('follows a different environment value on reload', async () => {
    const { apiFetch } = await importApiWith('https://prod.example.test')
    await apiFetch('/api/leave-requests')
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://prod.example.test/api/leave-requests'
    )
  })

  it('sends login requests to the same configured host', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'jwt-token',
    } as unknown as Response)
    const { loginRequest } = await importApiWith('https://staging.example.test')
    await loginRequest('a@b.com', 'password123')
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://staging.example.test/api/login'
    )
  })
})
