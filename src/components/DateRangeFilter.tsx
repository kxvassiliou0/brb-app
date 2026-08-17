import { CONTROL_CLASS } from '@/components/InputWithLabel'

interface DateRangeFilterProps {
  from: string
  to: string
  onChange: (patch: { from?: string; to?: string }) => void
}

export default function DateRangeFilter({
  from,
  to,
  onChange,
}: DateRangeFilterProps) {
  const active = Boolean(from || to)

  return (
    <details
      data-testid="date-range-filter"
      className="relative inline-block [&[open]>summary>svg]:rotate-180"
    >
      <summary
        className={`touch-target inline-flex cursor-pointer list-none items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
          active
            ? 'border-sage-foreground bg-sage-background text-sage-foreground'
            : 'border-border-interactive text-text-primary hover:bg-background-tertiary'
        }`}
      >
        Date range
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-3 w-3 transition-transform"
        >
          <path
            d="M3 6l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>

      <div className="absolute left-0 z-20 mt-2 flex w-64 flex-col gap-3 rounded-xl border border-border-primary bg-background-secondary p-4 shadow-lg">
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-from" className="text-sm text-text-secondary">
            From
          </label>
          <input
            id="filter-from"
            type="date"
            value={from}
            onChange={(event) => onChange({ from: event.target.value })}
            className={CONTROL_CLASS}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-to" className="text-sm text-text-secondary">
            To
          </label>
          <input
            id="filter-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => onChange({ to: event.target.value })}
            className={CONTROL_CLASS}
          />
        </div>
      </div>
    </details>
  )
}
