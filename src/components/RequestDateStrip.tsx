import { monthDays, monthLabel } from '@/lib/requestFilters'

interface RequestDateStripProps {
  month: string
  highlighted: Set<string>
}

export default function RequestDateStrip({
  month,
  highlighted,
}: RequestDateStripProps) {
  const days = monthDays(month)
  if (days.length === 0) return null

  return (
    <div
      data-testid="request-date-strip"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border-primary pb-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-sm font-medium text-text-primary">
          {monthLabel(month)}
        </span>
        <ol className="flex min-w-0 flex-wrap gap-1">
          {days.map((day) => {
            const isHighlighted = highlighted.has(day)
            return (
              <li key={day}>
                <span
                  data-testid="date-strip-day"
                  data-date={day}
                  data-highlighted={isHighlighted ? 'true' : undefined}
                  className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1 text-xs ${
                    isHighlighted
                      ? 'bg-sage-background font-medium text-sage-foreground'
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
      <span className="text-xs text-text-secondary">Requests highlighted</span>
    </div>
  )
}
