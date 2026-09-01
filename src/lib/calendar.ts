const LOCALE = 'en-GB'

const DAYS_IN_WEEK = 7

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

export function monthWeeks(month: string): CalendarDay[][] {
  const days = monthMatrix(month)
  return Array.from({ length: days.length / DAYS_IN_WEEK }, (_, week) =>
    days.slice(week * DAYS_IN_WEEK, (week + 1) * DAYS_IN_WEEK)
  )
}

export function monthBounds(month: string): { from: string; to: string } {
  const { year, monthIndex } = parseMonth(month)
  return {
    from: isoFromUtc(new Date(Date.UTC(year, monthIndex, 1))),
    to: isoFromUtc(new Date(Date.UTC(year, monthIndex + 1, 0))),
  }
}

export function monthGridRange(month: string): { from: string; to: string } {
  const days = monthMatrix(month)
  return {
    from: days[0]?.date ?? '',
    to: days[days.length - 1]?.date ?? '',
  }
}

export function weekOf(date: string): { from: string; to: string } {
  const day = new Date(`${date}T00:00:00Z`)
  const mondayOffset = (day.getUTCDay() + 6) % 7
  const monday = new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate() - mondayOffset
    )
  )
  const sunday = new Date(
    Date.UTC(
      monday.getUTCFullYear(),
      monday.getUTCMonth(),
      monday.getUTCDate() + DAYS_IN_WEEK - 1
    )
  )
  return { from: isoFromUtc(monday), to: isoFromUtc(sunday) }
}
