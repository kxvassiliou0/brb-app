const LOCALE = 'en-GB'

const DAYS_IN_GRID = 42

export const WEEKDAY_LABELS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
] as const

export interface CalendarDay {
  date: string
  dayOfMonth: number
  inMonth: boolean
}

function isoFromUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parseMonth(month: string): { year: number; monthIndex: number } {
  const [year, monthNumber] = month.split('-').map(Number)
  return { year: year ?? 1970, monthIndex: (monthNumber ?? 1) - 1 }
}

export function monthOf(date: string): string {
  return date.slice(0, 7)
}

export function addMonths(month: string, delta: number): string {
  const { year, monthIndex } = parseMonth(month)
  const shifted = new Date(Date.UTC(year, monthIndex + delta, 1))
  return isoFromUtc(shifted).slice(0, 7)
}

export function monthLabel(month: string): string {
  const { year, monthIndex } = parseMonth(month)
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString(LOCALE, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function monthMatrix(month: string): CalendarDay[] {
  const { year, monthIndex } = parseMonth(month)
  const first = new Date(Date.UTC(year, monthIndex, 1))
  const mondayOffset = (first.getUTCDay() + 6) % 7
  const start = new Date(Date.UTC(year, monthIndex, 1 - mondayOffset))

  return Array.from({ length: DAYS_IN_GRID }, (_, index) => {
    const day = new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + index
      )
    )
    return {
      date: isoFromUtc(day),
      dayOfMonth: day.getUTCDate(),
      inMonth: day.getUTCMonth() === monthIndex,
    }
  })
}
