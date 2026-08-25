const LOCALE = 'en-GB'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const SHORT_DATE: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
}

const LONG_DATE: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}

const FULL_DATE: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function toIsoDate(value: Date | string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (ISO_DATE.test(trimmed)) return trimmed
    if (ISO_DATE.test(trimmed.slice(0, 10))) return trimmed.slice(0, 10)
    return toIsoDate(new Date(trimmed))
  }
  if (Number.isNaN(value.getTime())) return ''
  const year = String(value.getFullYear()).padStart(4, '0')
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDate(date: string): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString(LOCALE, SHORT_DATE)
}

export function formatDateFull(date: string): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString(LOCALE, FULL_DATE)
}

export function formatDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) return formatDate(startDate)
  return `${formatDate(startDate)} – ${formatDate(endDate)}`
}

export function formatToday(date: Date = new Date()): string {
  return date.toLocaleDateString(LOCALE, LONG_DATE)
}

export function countDays(startDate: string, endDate: string): number {
  const start = Date.parse(startDate)
  const end = Date.parse(endDate)
  if (Number.isNaN(start) || Number.isNaN(end)) return 0
  return Math.max(0, Math.round((end - start) / MS_PER_DAY) + 1)
}

export function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}
