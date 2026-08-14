import type { ReactNode } from 'react'

export const CONTROL_CLASS =
  'touch-target w-full rounded-lg border-border-primary bg-background-secondary px-4 py-3 text-base text-text-primary placeholder:text-text-secondary'

interface FieldProps {
  id: string
  label: string
  children: ReactNode
}

export function Field({ id, label, children }: FieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-sm text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  )
}

interface InputWithLabelProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'password' | 'date'
  placeholder?: string
  autoComplete?: string
  required?: boolean
}

export default function InputWithLabel({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  required = false,
}: InputWithLabelProps) {
  return (
    <Field id={id} label={label}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={CONTROL_CLASS}
      />
    </Field>
  )
}
