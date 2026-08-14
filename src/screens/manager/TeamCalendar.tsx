import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/api'
import type { ApiSuccess, CalendarEntry } from '@/types/api'
import DataTable, { type DataTableColumn } from '@/components/DataTable'
import PageHeader from '../../components/PageHeader'

function currentMonthRange(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(from), to: fmt(to) }
}

export default function TeamCalendar() {
  const [rows, setRows] = useState<CalendarEntry[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setRows(null)
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    const { from, to } = currentMonthRange()
    let cancelled = false
    apiFetch<ApiSuccess<CalendarEntry[]>>(
      `/api/leave-requests/calendar?from=${from}&to=${to}`
    )
      .then((res) => {
        if (!cancelled) setRows(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const columns = useMemo<DataTableColumn<CalendarEntry>[]>(
    () => [
      { key: 'name', header: 'Name', cell: (r) => r.name },
      { key: 'type', header: 'Type', cell: (r) => r.leave_type },
      {
        key: 'dates',
        header: 'Dates',
        cell: (r) => `${r.start_date} – ${r.end_date}`,
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
        rows={rows}
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
