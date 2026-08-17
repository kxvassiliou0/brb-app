import { cachedGet } from '@/lib/apiCache'
import { toIsoDate } from '@/lib/dates'

export interface PublicHoliday {
  id?: number
  date: string
  name: string
}

export function holidaysByDate(holidays: PublicHoliday[]): Map<string, string> {
  return new Map(
    holidays.map((holiday) => [toIsoDate(holiday.date), holiday.name])
  )
}

export async function fetchPublicHolidays(): Promise<PublicHoliday[]> {
  const holidays = await cachedGet<PublicHoliday[]>('/api/public-holidays')
  return Array.isArray(holidays) ? holidays : []
}
