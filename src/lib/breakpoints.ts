export const BREAKPOINTS = {
  sm: '40rem',
  md: '48rem',
  lg: '64rem',
  xl: '80rem',
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

export const NAV_BREAKPOINT: Breakpoint = 'md'

export const TABLE_BREAKPOINT: Breakpoint = 'md'

export function minWidth(breakpoint: Breakpoint): string {
  return `(min-width: ${BREAKPOINTS[breakpoint]})`
}
