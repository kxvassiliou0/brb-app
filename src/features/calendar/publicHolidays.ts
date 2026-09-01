import type { PublicHoliday } from '@/api/publicHolidays'
import { toIsoDate } from '@/lib/dates'

export type { PublicHoliday }

export function holidaysByDate(holidays: PublicHoliday[]): Map<string, string> {
  return new Map(
    holidays.map((holiday) => [toIsoDate(holiday.date), holiday.name])
  )
}
