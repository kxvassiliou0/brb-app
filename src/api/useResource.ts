import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { clearApiCache } from '@/api/cache'

type ResourceFetcher<T> = () => Promise<T>

export interface Resource<T> {
  data: T | null
  error: unknown
  retry: () => void
  setData: Dispatch<SetStateAction<T | null>>
}

export function useResource<T>(
  fetcher: ResourceFetcher<T> | null,
  deps: unknown[] = []
): Resource<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    clearApiCache()
    setData(null)
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    if (fetcher === null) return
    let cancelled = false

    fetcher()
      .then((value) => {
        if (!cancelled) setData(value)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps])

  return { data, error, retry, setData }
}
