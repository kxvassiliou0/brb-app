import { apiFetch } from '@/lib/api'

export const CACHE_TTL_MS = 30_000

interface CacheEntry {
  at: number
  value: unknown
}

const entries = new Map<string, CacheEntry>()

const inFlight = new Map<string, Promise<unknown>>()

export function clearApiCache(): void {
  entries.clear()
  inFlight.clear()
}

export function cachedGet<T>(path: string, force = false): Promise<T> {
  if (force) {
    entries.delete(path)
    inFlight.delete(path)
  } else {
    const cached = entries.get(path)
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return Promise.resolve(cached.value as T)
    }
    const pending = inFlight.get(path)
    if (pending) return pending as Promise<T>
  }

  const request = apiFetch<T>(path)
    .then((value) => {
      entries.set(path, { at: Date.now(), value })
      inFlight.delete(path)
      return value
    })
    .catch((error: unknown) => {
      inFlight.delete(path)
      throw error
    })

  inFlight.set(path, request)
  return request
}
