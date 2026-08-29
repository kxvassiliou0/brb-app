import { useMemo, useState } from 'react'
import BookTimeOffButton from '@/components/requests/BookTimeOffButton'
import BookTimeOffModal from '@/components/requests/BookTimeOffModal'
import Button from '@/components/ui/Button'
import MonthCalendar from '@/components/requests/MonthCalendar'
import PageHeader from '@/components/layout/PageHeader'
import { ErrorState, LoadingState } from '@/components/ui/states'
import { monthGridRange, monthOf } from '@/lib/calendar'
import { formatDateFull, toIsoDate } from '@/lib/dates'
import { holidaysByDate, type PublicHoliday } from '@/lib/publicHolidays'
import { calendarSummary } from '@/lib/teamCalendar'
import { useApiResource } from '@/lib/useApiResource'
import type { ApiSuccess, CalendarEntry } from '@/types/api'

interface SelectedRange {
  startDate: string
  endDate: string
}

const SELECTION_HINT =
  'Select a start date, then an end date, to book time off.'

export default function TeamCalendar() {
  const today = toIsoDate(new Date())
  const [month, setMonth] = useState(() => monthOf(today))
  const [selectionStart, setSelectionStart] = useState<string | null>(null)
  const [range, setRange] = useState<SelectedRange | null>(null)

  const { from, to } = monthGridRange(month)
  const { data, error, retry } = useApiResource<ApiSuccess<CalendarEntry[]>>(
    `/api/leave-requests/calendar?from=${from}&to=${to}`
  )
  const { data: holidayData } = useApiResource<PublicHoliday[]>(
    '/api/public-holidays'
  )

  const entries = data?.data ?? null
  const holidays = useMemo(
    () => holidaysByDate(Array.isArray(holidayData) ? holidayData : []),
    [holidayData]
  )

  function selectDay(date: string): void {
    if (selectionStart === null) {
      setSelectionStart(date)
      return
    }
    const backwards = date < selectionStart
    setSelectionStart(null)
    setRange({
      startDate: backwards ? date : selectionStart,
      endDate: backwards ? selectionStart : date,
    })
  }

  return (
    <div data-testid="screen-team-calendar">
      <PageHeader
        title="Team calendar"
        description={
          entries === null ? undefined : calendarSummary(entries, month, today)
        }
        action={<BookTimeOffButton onBooked={retry} />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p
          role="status"
          aria-live="polite"
          data-testid="selection-status"
          className="text-sm text-text-secondary"
        >
          {selectionStart === null
            ? SELECTION_HINT
            : `Start date ${formatDateFull(selectionStart)} selected. Choose an end date, or the same date again for a single day.`}
        </p>
        {selectionStart !== null && (
          <Button variant="secondary" onClick={() => setSelectionStart(null)}>
            Clear selection
          </Button>
        )}
      </div>

      {error ? (
        <ErrorState
          error={error}
          onRetry={retry}
          fallbackMessage="Failed to load team calendar"
        />
      ) : entries === null ? (
        <LoadingState label="Loading team calendar" />
      ) : (
        <MonthCalendar
          month={month}
          entries={entries}
          holidays={holidays}
          selectionStart={selectionStart}
          onMonthChange={setMonth}
          onDayClick={selectDay}
        />
      )}

      {range && (
        <BookTimeOffModal
          initialRange={range}
          onClose={() => setRange(null)}
          onBooked={retry}
        />
      )}
    </div>
  )
}
