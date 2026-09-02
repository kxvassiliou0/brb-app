import type { ReactNode } from 'react'

export type ButtonVariant =
  'primary' | 'secondary' | 'danger' | 'ghost' | 'ghostDanger'

interface ButtonProps {
  children: ReactNode
  type?: 'button' | 'submit'
  variant?: ButtonVariant
  fullWidth?: boolean
  disabled?: boolean
  title?: string
  form?: string
  onClick?: () => void
}

export const BUTTON_BASE =
  'touch-target inline-flex items-center justify-center gap-3 rounded-full px-4 py-2 text-base leading-5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60'

const ICON_VARIANTS: ButtonVariant[] = ['ghost', 'ghostDanger']

export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-interactive-primary text-interactive-text hover:bg-interactive-hover',
  secondary:
    'border border-border-primary bg-background-secondary text-text-secondary hover:bg-background-tertiary hover:text-text-primary',
  danger: 'bg-error-background text-error-foreground hover:brightness-95',
  ghost: 'text-sage-foreground',
  ghostDanger: 'text-error-foreground',
}

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  title,
  form,
  onClick,
}: ButtonProps) {
  const base = ICON_VARIANTS.includes(variant)
    ? 'touch-target inline-flex items-center justify-center rounded-lg p-1.5 text-base leading-5 font-medium disabled:cursor-not-allowed disabled:opacity-60'
    : BUTTON_BASE

  return (
    <button
      type={type}
      disabled={disabled}
      title={title}
      form={form}
      onClick={onClick}
      className={`${base} ${BUTTON_VARIANT[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      {children}
    </button>
  )
}
