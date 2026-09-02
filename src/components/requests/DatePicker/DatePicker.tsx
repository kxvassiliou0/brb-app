import { useEffect, useRef, useState } from 'react'
import {
  addMonths,
  monthLabel,
  monthMatrix,
  monthOf,
  WEEKDAY_LABELS,
} from '@/lib/calendar'
import { formatDate, toIsoDate } from '@/lib/dates'

interface DatePickerProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  holidays: Map<string, string>
  min?: string
  error?: string
}

export default function DatePicker({
  id,
  label,
  value,
  onChange,
  holidays,
  min,
  error,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [browsedMonth, setBrowsedMonth] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const errorId = `${id}-error`
  const month = browsedMonth ?? monthOf(value || toIsoDate(new Date()))

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  function toggle(): void {
    setBrowsedMonth(null)
    setOpen((current) => !current)
  }

  function select(date: string): void {
    onChange(date)
    setBrowsedMonth(null)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-sm text-text-secondary">
        {label}
      </label>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={error ? errorId : undefined}
        onClick={toggle}
        className={`touch-target w-full rounded-lg border px-4 py-2 text-left text-base text-text-primary ${
          error
            ? 'border-error-foreground text-error-foreground'
            : 'border-border-interactive'
        }`}
      >
        {value ? formatDate(value) : `Select ${label.toLowerCase()}`}
      </button>
      {error && (
        <p id={errorId} className="text-sm text-error-foreground">
          {error}
        </p>
      )}
      {open && (
        <div
          role="dialog"
          aria-label={`${label} calendar`}
          data-testid={`${id}-calendar`}
          className="absolute top-full left-0 z-10 mt-2 w-full min-w-0 overflow-x-auto rounded-lg border border-border-primary bg-background-secondary p-3 shadow-xl shadow-black/10"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setBrowsedMonth(addMonths(month, -1))}
              className="touch-target rounded-full px-3 hover:bg-background-tertiary"
            >
              ‹
            </button>
            <span aria-live="polite" className="text-sm font-medium">
              {monthLabel(month)}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setBrowsedMonth(addMonths(month, 1))}
              className="touch-target rounded-full px-3 hover:bg-background-tertiary"
            >
              ›
            </button>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((weekday) => (
              <span
                key={weekday}
                aria-hidden="true"
                className="flex items-center justify-center text-xs text-text-secondary"
              >
                {weekday}
              </span>
            ))}
            {monthMatrix(month).map((day) => {
              const holiday = holidays.get(day.date)
              const beforeMin = Boolean(min && day.date < min)
              const disabled = Boolean(holiday) || beforeMin
              const selected = day.date === value
              return (
                <button
                  key={day.date}
                  type="button"
                  data-testid="calendar-day"
                  data-date={day.date}
                  disabled={disabled}
                  aria-current={selected ? 'date' : undefined}
                  aria-label={
                    holiday
                      ? `${formatDate(day.date)}, ${holiday}, public holiday`
                      : formatDate(day.date)
                  }
                  title={holiday ? `${holiday} (public holiday)` : undefined}
                  onClick={() => select(day.date)}
                  className={`touch-target flex items-center justify-center rounded-lg text-sm disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                    selected
                      ? 'bg-interactive-primary text-interactive-text'
                      : day.inMonth
                        ? 'hover:bg-background-tertiary'
                        : 'text-text-secondary hover:bg-background-tertiary'
                  }`}
                >
                  {day.dayOfMonth}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
