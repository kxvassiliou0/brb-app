import { get } from '@/api/client'

export interface PublicHoliday {
  id?: number
  date: string
  name: string
}

export async function listPublicHolidays(): Promise<PublicHoliday[]> {
  const holidays = await get<PublicHoliday[]>('/api/public-holidays')
  return Array.isArray(holidays) ? holidays : []
}
