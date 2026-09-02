import { get, patch, post, remove } from '@/api/client'

export interface PublicHoliday {
  id: number
  date: string
  name: string
}

export async function listPublicHolidays(): Promise<PublicHoliday[]> {
  const holidays = await get<PublicHoliday[]>('/api/public-holidays')
  return Array.isArray(holidays) ? holidays : []
}

export function createPublicHoliday(body: {
  date: string
  name: string
}): Promise<PublicHoliday> {
  return post<PublicHoliday>('/api/public-holidays', body)
}

export function updatePublicHoliday(
  id: number,
  body: { date: string; name: string }
): Promise<PublicHoliday> {
  return patch<PublicHoliday>(`/api/public-holidays/${id}`, body)
}

export function deletePublicHoliday(id: number): Promise<void> {
  return remove(`/api/public-holidays/${id}`)
}
