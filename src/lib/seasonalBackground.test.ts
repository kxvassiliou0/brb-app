import { describe, expect, it } from 'vitest'
import {
  SEASON_IMAGES,
  seasonFor,
  seasonalBackground,
  type Season,
} from '@/lib/seasonalBackground'

const MONTH_SEASONS: [string, number, Season][] = [
  ['January', 0, 'winter'],
  ['February', 1, 'winter'],
  ['March', 2, 'spring'],
  ['April', 3, 'spring'],
  ['May', 4, 'spring'],
  ['June', 5, 'spring'],
  ['July', 6, 'summer'],
  ['August', 7, 'summer'],
  ['September', 8, 'summer'],
  ['October', 9, 'summer'],
  ['November', 10, 'winter'],
  ['December', 11, 'winter'],
]

describe('seasonFor', () => {
  it('maps every month to its season', () => {
    for (const [name, month, season] of MONTH_SEASONS) {
      expect(seasonFor(new Date(2026, month, 15)), name).toBe(season)
    }
  })

  it('splits the year into three equal runs of four months', () => {
    const counts = MONTH_SEASONS.reduce<Record<string, number>>(
      (acc, [, month]) => {
        const season = seasonFor(new Date(2026, month, 1))
        acc[season] = (acc[season] ?? 0) + 1
        return acc
      },
      {}
    )
    expect(counts).toEqual({ spring: 4, summer: 4, winter: 4 })
  })
})

describe('seasonalBackground', () => {
  it('returns the image for the season of the given date', () => {
    expect(seasonalBackground(new Date(2026, 6, 1))).toBe(SEASON_IMAGES.summer)
  })

  it('resolves a distinct asset for every season', () => {
    const sources = Object.values(SEASON_IMAGES)
    expect(new Set(sources).size).toBe(sources.length)
    sources.forEach((src) => expect(src).toBeTruthy())
  })
})
