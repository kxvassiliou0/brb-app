import spring from '@/assets/backgrounds/spring.png'
import summer from '@/assets/backgrounds/summer.png'
import winter from '@/assets/backgrounds/winter.png'

export const SEASONS = ['spring', 'summer', 'winter'] as const

export type Season = (typeof SEASONS)[number]

export const SEASON_IMAGES: Record<Season, string> = {
  spring,
  summer,
  winter,
}

const MONTHS_PER_SEASON = 12 / SEASONS.length

const FIRST_SEASON_MONTH = 2

export function seasonFor(date: Date = new Date()): Season {
  const offset = (date.getMonth() - FIRST_SEASON_MONTH + 12) % 12
  return SEASONS[Math.floor(offset / MONTHS_PER_SEASON)] ?? 'spring'
}

export function seasonalBackground(date: Date = new Date()): string {
  return SEASON_IMAGES[seasonFor(date)]
}
