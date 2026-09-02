import { describe, expect, it } from 'vitest'
import {
  approvedLeave,
  calendarSummary,
  layoutMonth,
  NOBODY_OFF_MESSAGE,
  segmentLabel,
  shortName,
} from '@/features/calendar/teamCalendar'
import type { CalendarEntry, LeaveStatus } from '@/types/api'

const AUGUST = '2026-08'

const JULY = '2026-07'

interface EntryInput {
  employee_id?: number
  name?: string
  start_date: string
  end_date: string
  status?: LeaveStatus
}

function entry({
  employee_id = 1,
  name = 'Sophia Lambert',
  start_date,
  end_date,
  status = 'Approved',
}: EntryInput): CalendarEntry {
  return {
    employee_id,
    name,
    department_id: 1,
    leave_type: 'Vacation',
    start_date,
    end_date,
    status,
  }
}

function weekStarting(month: string, entries: CalendarEntry[], date: string) {
  const week = layoutMonth(month, entries).find((w) => w.key === date)
  if (!week) throw new Error(`No week starting ${date} in ${month}`)
  return week
}

describe('the month grid', () => {
  it('lays out six weeks of seven days, Monday to Sunday', () => {
    const weeks = layoutMonth(AUGUST, [])

    expect(weeks).toHaveLength(6)
    for (const week of weeks) expect(week.days).toHaveLength(7)
    expect(weeks[0]?.days[0]?.date).toBe('2026-07-27')
    expect(weeks[0]?.days[6]?.date).toBe('2026-08-02')
  })
})

describe('a range spanning a weekend', () => {
  it('spans all seven columns when it runs Monday to Sunday', () => {
    const monToSun = entry({ start_date: '2026-08-03', end_date: '2026-08-09' })
    const week = weekStarting(AUGUST, [monToSun], '2026-08-03')

    const segment = week.lanes[0]?.[0]
    expect(segment?.column).toBe(1)
    expect(segment?.span).toBe(7)
  })
})

describe('a range spanning a month boundary', () => {
  const crossing = entry({ start_date: '2026-07-30', end_date: '2026-08-03' })

  it('renders in the month it starts in', () => {
    const week = weekStarting(JULY, [crossing], '2026-07-27')

    expect(week.lanes[0]?.[0]?.column).toBe(4)
    expect(week.lanes[0]?.[0]?.span).toBe(4)
    expect(week.lanes[0]?.[0]?.continuesAfter).toBe(true)
  })
})

describe('overlapping absences', () => {
  it('places two absences on the same day in separate lanes', () => {
    const sophia = entry({
      employee_id: 1,
      name: 'Sophia Lambert',
      start_date: '2026-08-21',
      end_date: '2026-08-21',
    })
    const aiden = entry({
      employee_id: 2,
      name: 'Aiden Kumar',
      start_date: '2026-08-21',
      end_date: '2026-08-21',
    })
    const week = weekStarting(AUGUST, [sophia, aiden], '2026-08-17')

    expect(week.lanes).toHaveLength(2)
    expect(week.lanes[0]?.[0]?.entry.name).toBe('Aiden Kumar')
    expect(week.lanes[1]?.[0]?.entry.name).toBe('Sophia Lambert')
  })

  it('reuses a lane for absences that do not touch', () => {
    const early = entry({
      employee_id: 1,
      start_date: '2026-08-17',
      end_date: '2026-08-18',
    })
    const late = entry({
      employee_id: 2,
      name: 'Olivia Reed',
      start_date: '2026-08-20',
      end_date: '2026-08-21',
    })
    const week = weekStarting(AUGUST, [early, late], '2026-08-17')

    expect(week.lanes).toHaveLength(1)
    expect(week.lanes[0]).toHaveLength(2)
  })
})

describe('status filtering', () => {
  const approved = entry({
    employee_id: 1,
    name: 'Sophia Lambert',
    start_date: '2026-08-10',
    end_date: '2026-08-10',
  })
  const pending = entry({
    employee_id: 2,
    name: 'Mia Jensen',
    start_date: '2026-08-10',
    end_date: '2026-08-10',
    status: 'Pending',
  })
  const rejected = entry({
    employee_id: 3,
    name: 'Lucas Tran',
    start_date: '2026-08-10',
    end_date: '2026-08-10',
    status: 'Rejected',
  })
  const cancelled = entry({
    employee_id: 4,
    name: 'Ethan Hall',
    start_date: '2026-08-10',
    end_date: '2026-08-10',
    status: 'Cancelled',
  })

  it('keeps only Approved leave', () => {
    expect(
      approvedLeave([approved, pending, rejected, cancelled]).map((e) => e.name)
    ).toEqual(['Sophia Lambert'])
  })
})

describe('labels', () => {
  it('shortens a name to a first name and a surname initial', () => {
    expect(shortName('Sophia Lambert')).toBe('Sophia L.')
    expect(shortName('Mary Jane Watson')).toBe('Mary W.')
    expect(shortName('Cher')).toBe('Cher')
  })

  it('describes an absence in full for assistive technology', () => {
    expect(
      segmentLabel(entry({ start_date: '2026-08-03', end_date: '2026-08-07' }))
    ).toBe('Sophia Lambert, Vacation, 3 Aug 2026 – 7 Aug 2026')
  })
})

describe('the header summary', () => {
  it('counts distinct people off in the month', () => {
    const entries = [
      entry({
        employee_id: 1,
        start_date: '2026-08-03',
        end_date: '2026-08-05',
      }),
      entry({
        employee_id: 1,
        start_date: '2026-08-20',
        end_date: '2026-08-21',
      }),
      entry({
        employee_id: 2,
        name: 'Olivia Reed',
        start_date: '2026-08-24',
        end_date: '2026-08-25',
      }),
    ]

    expect(calendarSummary(entries, AUGUST, '2026-09-01')).toBe(
      '2 people off this month'
    )
  })

  it('adds the number away this week when the month contains today', () => {
    const entries = [
      entry({
        employee_id: 1,
        start_date: '2026-08-03',
        end_date: '2026-08-05',
      }),
      entry({
        employee_id: 2,
        name: 'Olivia Reed',
        start_date: '2026-08-24',
        end_date: '2026-08-25',
      }),
    ]

    expect(calendarSummary(entries, AUGUST, '2026-08-04')).toBe(
      '2 people off this month · 1 away this week'
    )
  })

  it('reports an empty month plainly', () => {
    expect(calendarSummary([], AUGUST, '2026-08-04')).toBe(NOBODY_OFF_MESSAGE)
  })
})
