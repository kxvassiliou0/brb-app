import type { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  type?: 'button' | 'submit'
  fullWidth?: boolean
  disabled?: boolean
  onClick?: () => void
}

export default function Button({
  children,
  type = 'button',
  fullWidth = false,
  disabled = false,
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full bg-interactive-primary px-6 py-3.5 text-base font-medium text-interactive-text transition-colors hover:bg-interactive-hover disabled:cursor-not-allowed disabled:opacity-60 ${fullWidth ? 'w-full' : ''}`}
    >
      {children}
    </button>
  )
}
