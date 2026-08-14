interface StatCardProps {
  label: string
  value: number | string
  hint?: string
}

export default function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div
      data-testid="stat-card"
      className="rounded-xl border border-border-primary bg-background-secondary p-4 sm:p-6"
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
