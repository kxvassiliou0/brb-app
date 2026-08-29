import { STATUS_TONE } from '@/components/ui/StatusPill'
import { formatDate } from '@/lib/dates'
import { nextDays } from '@/lib/requestFilters'
import type { LeaveStatus } from '@/types/api'

export default function RequestDateStrip({
  highlighted,
}: {
  highlighted: Map<string, LeaveStatus>
}) {
  const days = nextDays()

  const first = days[0]!
  const last = days[days.length - 1]!
  const anyHighlighted = days.some((day) => highlighted.has(day))

  return (
    <div
      data-testid="request-date-strip"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border-primary pb-4"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-sm font-medium text-text-primary">
          Next {days.length} days
          <span className="ml-2 font-normal text-text-secondary">
            {formatDate(first)} – {formatDate(last)}
          </span>
        </span>
        <ol className="flex min-w-0 flex-wrap gap-1">
          {days.map((day) => {
            const status = highlighted.get(day)
            return (
              <li key={day}>
                <span
                  data-testid="date-strip-day"
                  data-date={day}
                  data-status={status}
                  data-highlighted={status ? 'true' : undefined}
                  title={
                    status ? `${formatDate(day)}: ${status}` : formatDate(day)
                  }
                  className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1 text-xs ${
                    status
                      ? `font-medium ${STATUS_TONE[status]}`
                      : 'text-text-secondary'
                  }`}
                >
                  {Number(day.slice(-2))}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
      {anyHighlighted && (
        <span className="text-xs text-text-secondary">
          Requests highlighted
        </span>
      )}
    </div>
  )
}
