export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export type SegmentedVariant = 'tabs' | 'toggle'

interface SegmentedControlProps<T extends string> {
  label: string
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  variant?: SegmentedVariant
  testId?: string
}

const SEGMENT =
  'touch-target inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors'

const SELECTED = 'bg-interactive-primary text-interactive-text'

const UNSELECTED = 'text-text-secondary hover:bg-background-tertiary'

const TRACK: Record<SegmentedVariant, string> = {
  tabs: 'inline-flex max-w-full items-center gap-2 overflow-x-auto',
  toggle:
    'inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-background-tertiary p-1',
}

export default function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  variant = 'tabs',
  testId,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      data-testid={testId}
      className={TRACK[variant]}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`${SEGMENT} ${option.value === value ? SELECTED : UNSELECTED}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
