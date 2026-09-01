import Card, { type CardVariant } from '@/components/ui/Card'

type StatCardVariant = Extract<
  CardVariant,
  'bordered' | 'recessed' | 'positive'
>

interface StatCardProps {
  label: string
  value: number | string
  hint?: string
  variant?: StatCardVariant
}

export default function StatCard({
  label,
  value,
  hint,
  variant = 'bordered',
}: StatCardProps) {
  return (
    <Card variant={variant} size="sm" testId="stat-card">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd
        data-testid="stat-value"
        className="mt-2 font-serif text-3xl md:text-4xl"
      >
        {value}
      </dd>
      {hint && <p className="mt-2 text-sm text-text-secondary">{hint}</p>}
    </Card>
  )
}
