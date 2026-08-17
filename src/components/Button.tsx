import type { ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'

interface ButtonProps {
  children: ReactNode
  type?: 'button' | 'submit'
  variant?: ButtonVariant
  fullWidth?: boolean
  disabled?: boolean
  onClick?: () => void
}

export const BUTTON_BASE =
  'touch-target inline-flex items-center justify-center gap-3 rounded-full p-3 text-base leading-5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60'

export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-interactive-primary text-interactive-text hover:bg-interactive-hover',
  secondary:
    'border border-border-primary bg-background-secondary text-text-secondary hover:bg-background-tertiary hover:text-text-primary',
  danger: 'bg-error-background text-error-foreground hover:brightness-95',
}

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      {children}
    </button>
  )
}
