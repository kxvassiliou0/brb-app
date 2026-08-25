import type { ReactNode } from 'react'

export const CONTROL_CLASS =
  'touch-target w-full rounded-lg border-border-primary bg-background-secondary px-4 py-2 text-base text-text-primary placeholder:text-text-secondary'

const INVALID_CLASS = 'border-error-foreground text-error-foreground'

export function errorId(id: string): string {
  return `${id}-error`
}

export function controlClass(error?: string): string {
  return `${CONTROL_CLASS} ${error ? INVALID_CLASS : ''}`
}

interface FieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}

export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-sm text-text-secondary">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-text-secondary">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={errorId(id)} className="text-sm text-error-foreground">
          {error}
        </p>
      )}
    </div>
  )
}

interface InputWithLabelProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'password' | 'date' | 'number'
  placeholder?: string
  autoComplete?: string
  required?: boolean
  hint?: string
  error?: string
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
  hint,
  error,
}: InputWithLabelProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-describedby={error ? errorId(id) : hint ? `${id}-hint` : undefined}
        className={controlClass(error)}
      />
    </Field>
  )
}

export interface SelectOption {
  value: string
  label: string
}

interface SelectWithLabelProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  error?: string
}

export function SelectWithLabel({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}: SelectWithLabelProps) {
  return (
    <Field id={id} label={label} error={error}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={error ? errorId(id) : undefined}
        className={controlClass(error)}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
