import { useCallback, useEffect, useState } from 'react'
import { cachedGet } from '@/lib/apiCache'

export interface ApiResource<T> {
  data: T | null
  error: unknown
  retry: () => void
}

export function useApiResource<T>(path: string | null): ApiResource<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setData(null)
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    if (path === null) return
    let cancelled = false

    cachedGet<T>(path, attempt > 0)
      .then((value) => {
        if (!cancelled) setData(value)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err)
      })

    return () => {
      cancelled = true
    }
  }, [path, attempt])

  return { data, error, retry }
}
