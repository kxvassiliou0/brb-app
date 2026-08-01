import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import PageHeader from '../../components/PageHeader'

interface CalendarRow {
  employee_id: number
  name: string
  leave_type: string
  start_date: string
  end_date: string
}

function currentMonthRange(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(from), to: fmt(to) }
}

export default function TeamCalendar() {
  const [rows, setRows] = useState<CalendarRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const { from, to } = currentMonthRange()
    let cancelled = false
    apiFetch<{ data: CalendarRow[] }>(`/api/leave-requests/calendar?from=${from}&to=${to}`)
      .then((res) => {
        if (!cancelled) setRows(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load team calendar')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div data-testid="screen-team-calendar">
      <PageHeader title="Team calendar" description="Approved time off this month." />
      {error && <p role="alert">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Dates</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.name}</td>
              <td>{r.leave_type}</td>
              <td>
                {r.start_date} – {r.end_date}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
