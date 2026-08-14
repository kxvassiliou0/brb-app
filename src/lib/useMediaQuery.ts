import { useCallback, useSyncExternalStore } from 'react'
import { minWidth, type Breakpoint } from '@/lib/breakpoints'

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query]
  )

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query]
  )

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(minWidth(breakpoint))
}
