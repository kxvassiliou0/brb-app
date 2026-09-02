import planNextEscape from '@/assets/backgrounds/plan-next-escape.png'
import BookTimeOffButton from '@/components/requests/BookTimeOffButton'
import { countLabel } from '@/lib/dates'

interface PlanEscapeBannerProps {
  daysRemaining: number
  onBooked: () => void
}

export default function PlanEscapeBanner({
  daysRemaining,
  onBooked,
}: PlanEscapeBannerProps) {
  return (
    <section
      data-testid="plan-escape-banner"
      style={{ backgroundImage: `url(${planNextEscape})` }}
      className="relative overflow-hidden rounded-xl border border-border-primary bg-background-secondary bg-cover bg-center bg-no-repeat"
    >
      <div className="absolute inset-0 bg-linear-to-r from-background-secondary from-30% to-transparent" />
      <div className="relative flex min-w-0 flex-col items-start gap-4 p-4 sm:max-w-3/5 sm:p-6 lg:min-h-44 lg:justify-center">
        <h2 className="text-xl md:text-2xl">
          You have {countLabel(daysRemaining, 'day')} left. Plan your next
          escape
        </h2>
        <BookTimeOffButton onBooked={onBooked} />
      </div>
    </section>
  )
}
