import Icon from '@/components/Icon'

interface SearchInputProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

export default function SearchInput({
  id,
  label,
  placeholder,
  value,
  onChange,
}: SearchInputProps) {
  return (
    <div className="relative flex w-full min-w-0 items-center">
      <span className="pointer-events-none absolute left-4 flex text-text-primary">
        <Icon name="search" />
      </span>
      <input
        id={id}
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="touch-target w-full rounded-xl border border-border-primary bg-background-secondary py-3 pr-4 pl-12 text-base text-text-primary placeholder:text-text-secondary"
      />
    </div>
  )
}
