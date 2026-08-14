interface StatCardProps {
  label: string
  value: number | string
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border-primary bg-background-secondary p-4 sm:p-6">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="mt-2 font-serif text-3xl md:text-4xl">{value}</dd>
    </div>
  )
}
