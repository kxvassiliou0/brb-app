import type { ReactNode } from 'react'

interface DetailRowProps {
  label: string
  value: ReactNode
  emphasis?: boolean
}

export default function DetailRow({
  label,
  value,
  emphasis = false,
}: DetailRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-border-primary py-4">
      <dt className="text-text-secondary">{label}</dt>
      <dd
        className={`text-right font-medium ${
          emphasis ? 'text-pending-foreground' : 'text-text-primary'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
