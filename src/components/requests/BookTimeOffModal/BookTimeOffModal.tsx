import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import type { BookingConfirmationState } from '@/components/requests/BookingConfirmation'
import DatePicker from '@/components/requests/DatePicker'
import FormAlert from '@/components/ui/FormAlert'
import {
  CONTROL_CLASS,
  SelectWithLabel,
  type SelectOption,
} from '@/components/ui/InputWithLabel'
import Modal from '@/components/ui/Modal'
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
  LeaveRequest,
  LeaveType,
  RemainingLeave,
  UserProfile,
} from '@/types/api'

interface BookTimeOffModalProps {
  onClose: () => void
  onBooked?: () => void
  initialRange?: { startDate: string; endDate: string }
}

export default function BookTimeOffModal({
  onClose,
  onBooked,
  initialRange,
}: BookTimeOffModalProps) {
  const FORM_ID = 'book-time-off-form'

  const { user } = useAuth()
  const navigate = useNavigate()
  const canBookForOthers = isAdmin(user?.role)
  const [draft, setDraft] = useState<BookingDraft>(
    initialRange ? { ...EMPTY_DRAFT, ...initialRange } : EMPTY_DRAFT
  )
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
      const created = await apiFetch<ApiSuccess<LeaveRequest>>(
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

  const bookingForOptions: SelectOption[] =
    employees.length === 0 && user
      ? [{ value: String(user.id), label: `${user.email} (you)` }]
      : employees.map((employee) => ({
          value: String(employee.id),
          label:
            employee.id === user?.id ? `${employee.name} (you)` : employee.name,
        }))

  return (
    <Modal
      title="Book time off"
      onClose={onClose}
      description={
        bookingForSomeoneElse
          ? 'This request will be recorded against the employee you choose.'
          : 'Your request will be sent to your manager for approval.'
      }
      primary={{
        label: submitting ? 'Sending…' : 'Send request',
        disabled: submitting,
        form: FORM_ID,
      }}
      secondary={{ label: 'Cancel' }}
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit}
        data-testid="book-time-off-form"
        className="flex flex-col gap-5"
      >
        {canBookForOthers && (
          <SelectWithLabel
            id="booking-employee"
            label="Employee"
            value={bookingFor === null ? '' : String(bookingFor)}
            onChange={(value) => setEmployeeId(value ? Number(value) : null)}
            options={bookingForOptions}
          />
        )}

        <SelectWithLabel
          id="leave-type"
          label="Leave type"
          value={draft.leaveType}
          onChange={(value) => update({ leaveType: value as LeaveType | '' })}
          options={LEAVE_TYPES.map((type) => ({ value: type, label: type }))}
          placeholder="Select leave type"
          error={errors.leaveType}
        />

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

        {submitError && <FormAlert message={submitError} />}
      </form>
    </Modal>
  )
}
