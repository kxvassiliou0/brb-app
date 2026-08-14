import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { BUTTON_BASE, BUTTON_VARIANT, type ButtonVariant } from './Button'

interface LinkButtonProps extends Omit<LinkProps, 'className' | 'children'> {
  children: ReactNode
  variant?: ButtonVariant
  fullWidth?: boolean
}

export default function LinkButton({
  children,
  variant = 'primary',
  fullWidth = false,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      {...props}
      className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      {children}
    </Link>
  )
}
