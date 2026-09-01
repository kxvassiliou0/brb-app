import {
  monthBounds,
  monthWeeks,
  weekOf,
  type CalendarDay,
} from '@/lib/calendar'
import { formatDateRange } from '@/lib/dates'
import type { CalendarEntry } from '@/types/api'

export interface LeaveSegment {
  key: string
  entry: CalendarEntry
  column: number
  span: number
  continuesBefore: boolean
  continuesAfter: boolean
}

export interface WeekLayout {
  key: string
  days: CalendarDay[]
  lanes: LeaveSegment[][]
}

export const NOBODY_OFF_MESSAGE = 'Nobody on your team is off this month.'

function covers(entry: CalendarEntry, date: string): boolean {
  return entry.start_date <= date && entry.end_date >= date
}

function overlaps(entry: CalendarEntry, from: string, to: string): boolean {
  return entry.start_date <= to && entry.end_date >= from
}

function lastColumn(segment: LeaveSegment): number {
  return segment.column + segment.span - 1
}

export function approvedLeave(entries: CalendarEntry[]): CalendarEntry[] {
  return entries.filter((entry) => entry.status === 'Approved')
}

export function shortName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/)
  if (!first) return name
  const surname = rest.at(-1)
  return surname ? `${first} ${surname.charAt(0)}.` : first
}

export function segmentLabel(entry: CalendarEntry): string {
  const range = formatDateRange(entry.start_date, entry.end_date)
  return `${entry.name}, ${entry.leave_type}, ${range}`
}

function segmentFor(
  entry: CalendarEntry,
  days: CalendarDay[]
): LeaveSegment | null {
  const covered = days
    .map((day, index) => (covers(entry, day.date) ? index : -1))
    .filter((index) => index !== -1)
  const first = covered[0]
  if (first === undefined) return null
  return {
    key: `${entry.employee_id}-${entry.start_date}-${entry.end_date}`,
    entry,
    column: first + 1,
    span: covered.length,
    continuesBefore: entry.start_date < (days[0]?.date ?? ''),
    continuesAfter: entry.end_date > (days.at(-1)?.date ?? ''),
  }
}

function layoutWeek(
  days: CalendarDay[],
  entries: CalendarEntry[]
): LeaveSegment[][] {
  const segments = entries
    .map((entry) => segmentFor(entry, days))
    .filter((segment): segment is LeaveSegment => segment !== null)
    .sort(
      (a, b) =>
        a.column - b.column ||
        b.span - a.span ||
        a.entry.name.localeCompare(b.entry.name)
    )

  const lanes: LeaveSegment[][] = []
  for (const segment of segments) {
    const free = lanes.find((lane) =>
      lane.every(
        (other) =>
          lastColumn(other) < segment.column ||
          other.column > lastColumn(segment)
      )
    )
    if (free) free.push(segment)
    else lanes.push([segment])
  }
  return lanes
}

export function layoutMonth(
  month: string,
  entries: CalendarEntry[]
): WeekLayout[] {
  const approved = approvedLeave(entries)
  return monthWeeks(month).map((days) => ({
    key: days[0]?.date ?? month,
    days,
    lanes: layoutWeek(days, approved),
  }))
}

function peopleOff(entries: CalendarEntry[], from: string, to: string): number {
  return new Set(
    entries
      .filter((entry) => overlaps(entry, from, to))
      .map((entry) => entry.employee_id)
  ).size
}

function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? 'person' : 'people'}`
}

export function calendarSummary(
  entries: CalendarEntry[],
  month: string,
  today: string
): string {
  const approved = approvedLeave(entries)
  const { from, to } = monthBounds(month)

  const thisMonth = peopleOff(approved, from, to)
  if (thisMonth === 0) return NOBODY_OFF_MESSAGE

  const summary = `${peopleLabel(thisMonth)} off this month`
  if (today < from || today > to) return summary

  const week = weekOf(today)
  return `${summary} · ${peopleOff(approved, week.from, week.to)} away this week`
}
