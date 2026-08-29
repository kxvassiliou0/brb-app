export type StatCardTone = 'default' | 'recessed' | 'positive'

const TONE: Record<StatCardTone, string> = {
  default: 'border border-border-primary bg-background-secondary',
  recessed: 'bg-background-primary',
  positive: 'bg-sage-background',
}

interface StatCardProps {
  label: string
  value: number | string
  hint?: string
  tone?: StatCardTone
}

export default function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: StatCardProps) {
  return (
    <div
      data-testid="stat-card"
      className={`rounded-xl p-4 sm:p-6 ${TONE[tone]}`}
    >
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd
        data-testid="stat-value"
        className="mt-2 font-serif text-3xl md:text-4xl"
      >
        {value}
      </dd>
      {hint && <p className="mt-2 text-sm text-text-secondary">{hint}</p>}
    </div>
  )
}
