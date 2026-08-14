import { BREAKPOINTS, type Breakpoint } from '@/lib/breakpoints'

const ROOT_FONT_SIZE = 16

type Listener = () => void

const listeners = new Set<Listener>()

let currentWidth = 1024

export function toPx(length: string): number {
  const value = Number.parseFloat(length)
  return length.trim().endsWith('rem') ? value * ROOT_FONT_SIZE : value
}

export function breakpointPx(breakpoint: Breakpoint): number {
  return toPx(BREAKPOINTS[breakpoint])
}

function matches(query: string): boolean {
  const min = query.match(/min-width:\s*([\d.]+(?:px|rem))/)
  if (min?.[1]) return currentWidth >= toPx(min[1])
  const max = query.match(/max-width:\s*([\d.]+(?:px|rem))/)
  if (max?.[1]) return currentWidth <= toPx(max[1])
  return false
}

export function setViewportWidth(width: number): void {
  currentWidth = width
  window.innerWidth = width
  window.matchMedia = ((query: string) => ({
    media: query,
    get matches() {
      return matches(query)
    },
    onchange: null,
    addEventListener: (_: string, listener: Listener) => {
      listeners.add(listener)
    },
    removeEventListener: (_: string, listener: Listener) => {
      listeners.delete(listener)
    },
    addListener: (listener: Listener) => {
      listeners.add(listener)
    },
    removeListener: (listener: Listener) => {
      listeners.delete(listener)
    },
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  for (const listener of [...listeners]) listener()
}

export function mobileWidth(breakpoint: Breakpoint = 'md'): number {
  return breakpointPx(breakpoint) - 1
}

export function desktopWidth(breakpoint: Breakpoint = 'md'): number {
  return breakpointPx(breakpoint)
}

export function resetViewport(): void {
  listeners.clear()
  setViewportWidth(desktopWidth('lg'))
}
