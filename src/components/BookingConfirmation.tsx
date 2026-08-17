import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

export interface BookingConfirmationState {
  bookingConfirmation: string
  bookingRequestId: number
}

export function useBookingConfirmation(): Partial<BookingConfirmationState> {
  const location = useLocation()
  return (location.state as BookingConfirmationState | null) ?? {}
}

export default function BookingConfirmation({
  message,
}: {
  message: string | null
}) {
  const messageRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (messageRef.current) messageRef.current.textContent = message
  }, [message])

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="booking-confirmation-region"
    >
      {message !== null && (
        <p
          ref={messageRef}
          data-testid="booking-confirmation"
          className="mb-6 rounded-lg bg-sage-background px-4 py-3 text-sm text-sage-foreground"
        />
      )}
    </div>
  )
}
