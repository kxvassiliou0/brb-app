import { useMemo, useState } from 'react'
import BookTimeOffButton from '@/components/requests/BookTimeOffButton'
import BookTimeOffModal from '@/components/requests/BookTimeOffModal'
import PublicHolidayFormModal from '@/components/holidays/PublicHolidayFormModal'
import Button from '@/components/ui/Button'
import MonthCalendar from '@/components/requests/MonthCalendar'
import PageHeader from '@/components/layout/PageHeader'
import { ErrorState, LoadingState } from '@/components/ui/states'
import { monthGridRange, monthOf } from '@/lib/calendar'
import { formatDateFull, toIsoDate } from '@/lib/dates'
import {
  holidaysByDate,
  type PublicHoliday,
} from '@/features/calendar/publicHolidays'
import { calendarSummary } from '@/features/calendar/teamCalendar'
import { listCalendar } from '@/api/leaveRequests'
import { listPublicHolidays } from '@/api/publicHolidays'
import { useResource } from '@/api/useResource'
import { useAuth } from '@/features/auth/auth'
import { isAdmin } from '@/lib/routeAccess'

interface SelectedRange {
  startDate: string
  endDate: string
}

const SELECTION_HINT =
  'Select a start date, then an end date, to book time off.'

export default function TeamCalendar() {
  const { user } = useAuth()
  const canManageHolidays = isAdmin(user?.role)
  const today = toIsoDate(new Date())
  const [month, setMonth] = useState(() => monthOf(today))
  const [selectionStart, setSelectionStart] = useState<string | null>(null)
  const [range, setRange] = useState<SelectedRange | null>(null)
  const [managing, setManaging] = useState<PublicHoliday | null>(null)

  const { from, to } = monthGridRange(month)
  const {
    data: entries,
    error,
    retry,
  } = useResource(() => listCalendar(from, to), [from, to])
  const { data: holidayData, retry: retryHolidays } =
    useResource(listPublicHolidays)

  function refresh(): void {
    retry()
    retryHolidays()
  }

  const holidayList = useMemo(
    () => (Array.isArray(holidayData) ? holidayData : []),
    [holidayData]
  )

  const holidays = useMemo(() => holidaysByDate(holidayList), [holidayList])

  function selectDay(date: string): void {
    if (selectionStart === null) {
      const holiday = holidayList.find(
        (entry) => toIsoDate(entry.date) === date
      )
      if (canManageHolidays && holiday) {
        setManaging(holiday)
        return
      }
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
        action={<BookTimeOffButton onBooked={refresh} />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p
          role="status"
          aria-live="polite"
          data-testid="selection-status"
          className="text-sm text-text-secondary"
        >
          {selectionStart === null
            ? canManageHolidays
              ? `${SELECTION_HINT} Select a public holiday to rename or remove it.`
              : SELECTION_HINT
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
          onBooked={refresh}
        />
      )}

      {managing && (
        <PublicHolidayFormModal
          holiday={managing}
          onClose={() => setManaging(null)}
          onChanged={refresh}
        />
      )}
    </div>
  )
}
