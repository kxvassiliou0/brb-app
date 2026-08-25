import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import type { BookingConfirmationState } from '@/components/BookingConfirmation'
import Button from '@/components/Button'
import DatePicker from '@/components/DatePicker'
import { CONTROL_CLASS } from '@/components/InputWithLabel'
import Modal from '@/components/Modal'
import { apiFetch } from '@/lib/api'
import { cachedGet, clearApiCache } from '@/lib/apiCache'
import { useAuth } from '@/lib/auth'
import {
  BOOKING_CONFIRMATION_FALLBACK,
  bookingErrorMessage,
  buildCreateBody,
  EMPTY_DRAFT,
  employeeOptions,
  hasBookingErrors,
  LEAVE_TYPES,
  remainingAfterRequest,
  requestedDays,
  validateBooking,
  type BookingDraft,
  type BookingErrors,
  type EmployeeOption,
} from '@/lib/booking'
import { countLabel } from '@/lib/dates'
import { fetchPublicHolidays, holidaysByDate } from '@/lib/publicHolidays'
import { isAdmin, REQUESTS_PATH } from '@/lib/routeAccess'
import { remainingLeavePath } from '@/lib/teamBalances'
import type {
  ApiSuccess,
  CreateLeaveRequestResult,
  LeaveType,
  RemainingLeave,
  UserProfile,
} from '@/types/api'

interface BookTimeOffModalProps {
  onClose: () => void
  onBooked?: () => void
}

export default function BookTimeOffModal({
  onClose,
  onBooked,
}: BookTimeOffModalProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canBookForOthers = isAdmin(user?.role)
  const [draft, setDraft] = useState<BookingDraft>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<BookingErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map())
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [employeeId, setEmployeeId] = useState<number | null>(null)

  const bookingFor = employeeId ?? user?.id ?? null

  const bookingForSomeoneElse =
    canBookForOthers && bookingFor !== null && bookingFor !== user?.id

  useEffect(() => {
    if (!user) return
    let cancelled = false

    fetchPublicHolidays()
      .then((res) => {
        if (!cancelled) setHolidays(holidaysByDate(res))
      })
      .catch(() => {
        if (!cancelled) setHolidays(new Map())
      })

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (bookingFor === null) return
    let cancelled = false

    cachedGet<ApiSuccess<RemainingLeave>>(remainingLeavePath(bookingFor))
      .then((res) => {
        if (!cancelled) setDaysRemaining(res.data.days_remaining)
      })
      .catch(() => {
        if (!cancelled) setDaysRemaining(null)
      })

    return () => {
      cancelled = true
    }
  }, [bookingFor])

  useEffect(() => {
    if (!canBookForOthers) return
    let cancelled = false

    cachedGet<ApiSuccess<UserProfile[]>>('/api/users')
      .then((res) => {
        if (!cancelled) setEmployees(employeeOptions(res.data))
      })
      .catch(() => {
        if (!cancelled) setEmployees([])
      })

    return () => {
      cancelled = true
    }
  }, [canBookForOthers])

  function update(patch: Partial<BookingDraft>): void {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors({})
    setSubmitError(null)
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const found = validateBooking(draft)
    setErrors(found)
    if (hasBookingErrors(found)) return

    setSubmitError(null)
    setSubmitting(true)
    try {
      const created = await apiFetch<ApiSuccess<CreateLeaveRequestResult>>(
        '/api/leave-requests',
        {
          method: 'POST',
          body: JSON.stringify(
            buildCreateBody(
              draft,
              canBookForOthers && bookingFor !== null ? bookingFor : undefined
            )
          ),
        }
      )
      clearApiCache()
      onBooked?.()
      onClose()
      navigate(REQUESTS_PATH, {
        state: {
          bookingConfirmation:
            created?.message ?? BOOKING_CONFIRMATION_FALLBACK,
          bookingRequestId: created?.data?.id,
        } satisfies BookingConfirmationState,
      })
    } catch (err) {
      setSubmitError(bookingErrorMessage(err, draft, daysRemaining))
    } finally {
      setSubmitting(false)
    }
  }

  const days = requestedDays(draft)

  return (
    <Modal label="Book time off" onClose={onClose}>
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl md:text-3xl">Book time off</h2>
        <p className="text-sm text-text-secondary">
          {bookingForSomeoneElse
            ? 'This request will be recorded against the employee you choose.'
            : 'Your request will be sent to your manager for approval.'}
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        data-testid="book-time-off-form"
        className="flex flex-col gap-5"
      >
        {canBookForOthers && (
          <div className="flex min-w-0 flex-col gap-2">
            <label
              htmlFor="booking-employee"
              className="text-sm text-text-secondary"
            >
              Employee
            </label>
            <select
              id="booking-employee"
              value={bookingFor ?? ''}
              onChange={(event) =>
                setEmployeeId(
                  event.target.value ? Number(event.target.value) : null
                )
              }
              className={CONTROL_CLASS}
            >
              {employees.length === 0 && user && (
                <option value={user.id}>{user.email} (you)</option>
              )}
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.id === user?.id
                    ? `${employee.name} (you)`
                    : employee.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="leave-type" className="text-sm text-text-secondary">
            Leave type
          </label>
          <select
            id="leave-type"
            value={draft.leaveType}
            aria-describedby={errors.leaveType ? 'leave-type-error' : undefined}
            onChange={(event) =>
              update({ leaveType: event.target.value as LeaveType | '' })
            }
            className={`${CONTROL_CLASS} ${errors.leaveType ? 'border-error-foreground text-error-foreground' : ''}`}
          >
            <option value="">Select leave type</option>
            {LEAVE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.leaveType && (
            <p id="leave-type-error" className="text-sm text-error-foreground">
              {errors.leaveType}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DatePicker
            id="start-date"
            label="Start date"
            value={draft.startDate}
            onChange={(startDate) => update({ startDate })}
            holidays={holidays}
            error={errors.startDate}
          />
          <DatePicker
            id="end-date"
            label="End date"
            value={draft.endDate}
            onChange={(endDate) => update({ endDate })}
            holidays={holidays}
            min={draft.startDate || undefined}
            error={errors.endDate}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="reason" className="text-sm text-text-secondary">
            Note (optional)
          </label>
          <textarea
            id="reason"
            rows={3}
            value={draft.reason}
            placeholder="Family holiday plans"
            onChange={(event) => update({ reason: event.target.value })}
            className={CONTROL_CLASS}
          />
        </div>

        {days > 0 && (
          <p
            data-testid="booking-summary"
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-sage-background px-4 py-3 text-sm text-sage-foreground"
          >
            <span className="font-medium">{countLabel(days, 'day')}</span>
            {daysRemaining !== null && (
              <span data-testid="booking-remaining">
                {countLabel(remainingAfterRequest(daysRemaining, draft), 'day')}{' '}
                remaining after this request
              </span>
            )}
          </p>
        )}

        {submitError && (
          <p
            role="alert"
            className="rounded-lg bg-error-background px-4 py-3 text-sm text-error-foreground"
          >
            {submitError}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send request'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
