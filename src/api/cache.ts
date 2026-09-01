const CACHE_TTL_MS = 30_000

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

export function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = entries.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return Promise.resolve(hit.value as T)
  }
  const pending = inFlight.get(key)
  if (pending) return pending as Promise<T>

  const request = load()
    .then((value) => {
      entries.set(key, { at: Date.now(), value })
      inFlight.delete(key)
      return value
    })
    .catch((error: unknown) => {
      inFlight.delete(key)
      throw error
    })

  inFlight.set(key, request)
  return request
}
