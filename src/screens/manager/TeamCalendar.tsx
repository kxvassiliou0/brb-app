import { useMemo } from 'react'
import DataTable, { type DataTableColumn } from '@/components/DataTable'
import PageHeader from '@/components/PageHeader'
import { formatDateRange, toIsoDate } from '@/lib/dates'
import { useApiResource } from '@/lib/useApiResource'
import type { ApiSuccess, CalendarEntry } from '@/types/api'

function currentMonthRange(): { from: string; to: string } {
  const now = new Date()
  return {
    from: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

export default function TeamCalendar() {
  const { from, to } = useMemo(() => currentMonthRange(), [])

  const { data, error, retry } = useApiResource<ApiSuccess<CalendarEntry[]>>(
    `/api/leave-requests/calendar?from=${from}&to=${to}`
  )

  const columns = useMemo<DataTableColumn<CalendarEntry>[]>(
    () => [
      { key: 'name', header: 'Name', cell: (r) => r.name },
      { key: 'type', header: 'Type', cell: (r) => r.leave_type },
      {
        key: 'dates',
        header: 'Dates',
        cell: (r) => formatDateRange(r.start_date, r.end_date),
      },
    ],
    []
  )

  return (
    <div data-testid="screen-team-calendar">
      <PageHeader
        title="Team calendar"
        description="Approved time off this month."
      />
      <DataTable
        caption="Approved time off this month"
        columns={columns}
        rows={data?.data ?? null}
        rowKey={(r) => `${r.employee_id}-${r.start_date}`}
        error={error}
        onRetry={retry}
        loadingLabel="Loading team calendar"
        errorFallbackMessage="Failed to load team calendar"
        emptyMessage="Nobody on your team is off this month."
      />
    </div>
  )
}
