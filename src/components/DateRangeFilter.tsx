import { BUTTON_BASE, BUTTON_VARIANT } from '@/components/Button'
import Icon from '@/components/Icon'
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
      className="relative [&[open]_svg]:rotate-180"
    >
      <summary
        className={`${BUTTON_BASE} cursor-pointer list-none ${
          active
            ? 'border border-sage-foreground bg-sage-background text-sage-foreground'
            : BUTTON_VARIANT.secondary
        }`}
      >
        Date range
        <Icon name="chevronDown" />
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
