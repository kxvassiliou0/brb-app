import { useMemo } from 'react'
import {
  addMonths,
  monthLabel,
  WEEKDAY_LABELS,
  type CalendarDay,
} from '@/lib/calendar'
import { formatDateFull } from '@/lib/dates'
import {
  layoutMonth,
  segmentLabel,
  shortName,
  type LeaveSegment,
  type WeekLayout,
} from '@/features/calendar/teamCalendar'
import type { CalendarEntry } from '@/types/api'

interface MonthCalendarProps {
  month: string
  entries: CalendarEntry[]
  holidays: Map<string, string>
  selectionStart: string | null
  onMonthChange: (month: string) => void
  onDayClick: (date: string) => void
}

const NAV_CLASS =
  'touch-target inline-flex items-center justify-center rounded-full border border-border-primary text-lg text-text-primary hover:bg-background-tertiary'

function dayTone(
  day: CalendarDay,
  selected: boolean,
  holiday: string | undefined
): string {
  if (selected) return 'bg-interactive-primary text-interactive-text'
  if (holiday) return 'bg-pending-background text-pending-foreground'
  const text = day.inMonth ? 'text-text-primary' : 'text-text-secondary'
  return `${text} hover:bg-background-tertiary`
}

interface DayCellProps {
  day: CalendarDay
  holiday: string | undefined
  selected: boolean
  onClick: () => void
}

function DayCell({ day, holiday, selected, onClick }: DayCellProps) {
  return (
    <button
      type="button"
      data-testid="calendar-day"
      data-date={day.date}
      aria-pressed={selected}
      aria-label={
        holiday
          ? `${formatDateFull(day.date)}, ${holiday}, public holiday`
          : formatDateFull(day.date)
      }
      onClick={onClick}
      className={`touch-target flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-1 text-left ${dayTone(day, selected, holiday)}`}
    >
      <span aria-hidden="true">{day.dayOfMonth}</span>
      {holiday && (
        <span
          aria-hidden="true"
          data-testid="public-holiday"
          className="w-full truncate text-xs font-medium"
        >
          {holiday}
        </span>
      )}
    </button>
  )
}

function LeaveBar({ segment, lane }: { segment: LeaveSegment; lane: number }) {
  return (
    <div
      data-testid="leave-bar"
      data-employee-id={segment.entry.employee_id}
      style={{
        gridColumn: `${segment.column} / span ${segment.span}`,
        gridRow: lane + 1,
      }}
      className={`flex items-center overflow-hidden rounded-sm px-2 text-sm font-medium whitespace-nowrap bg-sage-background text-sage-foreground ${segment.continuesBefore ? 'rounded-l-none' : ''} ${
        segment.continuesAfter ? 'rounded-r-none' : ''
      }`}
    >
      <span className="sr-only">{segmentLabel(segment.entry)}</span>
      <span aria-hidden="true" className="truncate">
        {shortName(segment.entry.name)}
      </span>
    </div>
  )
}

interface WeekRowProps {
  week: WeekLayout
  holidays: Map<string, string>
  selectionStart: string | null
  onDayClick: (date: string) => void
}

function WeekRow({ week, holidays, selectionStart, onDayClick }: WeekRowProps) {
  return (
    <div
      data-testid="calendar-week"
      className="border-t border-border-primary py-2"
    >
      <div className="grid grid-cols-7 gap-1">
        {week.days.map((day) => (
          <DayCell
            key={day.date}
            day={day}
            holiday={holidays.get(day.date)}
            selected={day.date === selectionStart}
            onClick={() => onDayClick(day.date)}
          />
        ))}
      </div>
      <div
        className="mt-1 grid min-h-8 grid-cols-7 gap-1"
        style={{ gridAutoRows: '1.5rem' }}
      >
        {week.lanes.flatMap((lane, index) =>
          lane.map((segment) => (
            <LeaveBar key={segment.key} segment={segment} lane={index} />
          ))
        )}
      </div>
    </div>
  )
}

export default function MonthCalendar({
  month,
  entries,
  holidays,
  selectionStart,
  onMonthChange,
  onDayClick,
}: MonthCalendarProps) {
  const weeks = useMemo(() => layoutMonth(month, entries), [month, entries])

  return (
    <div className="w-full rounded-2xl bg-background-secondary shadow-xl shadow-black/10">
      <div className="flex items-center justify-between gap-3 border-b border-border-primary px-4 py-3 sm:px-6">
        <button
          type="button"
          aria-label="Previous month"
          data-testid="previous-month"
          onClick={() => onMonthChange(addMonths(month, -1))}
          className={NAV_CLASS}
        >
          ‹
        </button>
        <h2
          aria-live="polite"
          data-testid="calendar-month"
          className="text-lg md:text-xl"
        >
          {monthLabel(month)}
        </h2>
        <button
          type="button"
          aria-label="Next month"
          data-testid="next-month"
          onClick={() => onMonthChange(addMonths(month, 1))}
          className={NAV_CLASS}
        >
          ›
        </button>
      </div>

      <div className="overflow-x-auto p-2 sm:p-4">
        <div className="min-w-[44rem]">
          <div className="grid grid-cols-7 gap-1 px-2 pb-2">
            {WEEKDAY_LABELS.map((weekday) => (
              <span
                key={weekday}
                data-testid="weekday-heading"
                className="text-sm text-text-secondary"
              >
                {weekday}
              </span>
            ))}
          </div>

          {weeks.map((week) => (
            <WeekRow
              key={week.key}
              week={week}
              holidays={holidays}
              selectionStart={selectionStart}
              onDayClick={onDayClick}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
