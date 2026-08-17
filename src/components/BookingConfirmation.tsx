import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

export interface BookingConfirmationState {
  bookingConfirmation?: string
  bookingRequestId?: number
}

export function useBookingConfirmation(): BookingConfirmationState {
  const location = useLocation()
  return (location.state as BookingConfirmationState | null) ?? {}
}

export default function BookingConfirmation({ message }: { message?: string }) {
  const messageRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const node = messageRef.current
    if (node) node.textContent = message ?? ''
  }, [message])

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="booking-confirmation-region"
      className={message ? 'mb-6' : undefined}
    >
      {message && (
        <p
          ref={messageRef}
          data-testid="booking-confirmation"
          className="rounded-lg bg-sage-background px-4 py-3 text-sm text-sage-foreground"
        />
      )}
    </div>
  )
}
