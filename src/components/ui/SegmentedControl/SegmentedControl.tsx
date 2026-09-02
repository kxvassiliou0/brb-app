export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

type SegmentedVariant = 'tabs' | 'slider'

interface SegmentedControlProps<T extends string> {
  label: string
  testId: string
  variant: SegmentedVariant
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}

export default function SegmentedControl<T extends string>({
  label,
  testId,
  variant,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const isSlider = variant === 'slider'
  const selectedIndex = options.findIndex((option) => option.value === value)

  return (
    <div
      role="group"
      aria-label={label}
      data-testid={testId}
      className={
        isSlider
          ? 'relative grid rounded-full border border-border-primary bg-background-secondary p-1'
          : 'flex flex-wrap items-center gap-2'
      }
      style={
        isSlider
          ? {
              gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
            }
          : undefined
      }
    >
      {isSlider && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 rounded-full bg-interactive-primary transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{
            width: `calc((100% - 0.5rem) / ${options.length})`,
            transform: `translateX(${selectedIndex * 100}%)`,
          }}
        />
      )}

      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            data-value={option.value}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`touch-target relative z-10 rounded-full px-4 text-sm font-medium transition-colors ${
              selected
                ? isSlider
                  ? 'text-interactive-text'
                  : 'bg-interactive-primary text-interactive-text'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
