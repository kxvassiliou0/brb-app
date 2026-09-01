import type { ReactNode } from 'react'

export type CardVariant = 'raised' | 'bordered' | 'recessed' | 'positive'

type CardSize = 'sm' | 'lg'

const VARIANT: Record<CardVariant, string> = {
  raised: 'bg-background-secondary shadow-xl shadow-black/10',
  bordered: 'border border-border-primary bg-background-secondary',
  recessed: 'bg-background-primary',
  positive: 'bg-sage-background',
}

const SIZE: Record<CardSize, string> = {
  sm: 'rounded-xl p-4 sm:p-6',
  lg: 'rounded-2xl p-6 sm:p-8',
}

interface CardProps {
  children: ReactNode
  variant?: CardVariant
  size?: CardSize
  testId?: string
}

export default function Card({
  children,
  variant = 'raised',
  size = 'lg',
  testId,
}: CardProps) {
  return (
    <div
      data-testid={testId}
      className={`w-full ${SIZE[size]} ${VARIANT[variant]}`}
    >
      {children}
    </div>
  )
}
