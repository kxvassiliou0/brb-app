import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import type { BookingConfirmationState } from '@/components/requests/BookingConfirmation'
import DatePicker from '@/components/requests/DatePicker'
import FormAlert from '@/components/ui/FormAlert'
import InputWithLabel, {
  CONTROL_CLASS,
  SelectWithLabel,
  type SelectOption,
} from '@/components/ui/InputWithLabel'
import Modal from '@/components/ui/Modal'
import {
  createLeaveRequest,
  getRemainingLeave,
  listAllRequests,
} from '@/api/leaveRequests'
import { listUserProfiles } from '@/api/users'
import { useAuth } from '@/features/auth/auth'
import {
  BOOKING_CONFIRMATION_FALLBACK,
  bookingErrorMessage,
  buildCreateBody,
  EMPTY_DRAFT,
  employeeOptions,
  hasBookingErrors,
  holidaysInRange,
  LEAVE_TYPES,
  remainingAfterRequest,
  requestedDays,
  validateBooking,
  type BookingDraft,
  type BookingErrors,
  type EmployeeOption,
} from '@/features/requests/booking'
import { countLabel } from '@/lib/dates'
import { listPublicHolidays } from '@/api/publicHolidays'
import {
  approvedClashWarning,
  holidaysByDate,
  saveHoliday,
  validateHoliday,
  type HolidayErrors,
  type PublicHoliday,
} from '@/features/calendar/publicHolidays'
import { isAdmin, REQUESTS_PATH } from '@/lib/routeAccess'
import type { LeaveRequest, LeaveType } from '@/types/api'

const PUBLIC_HOLIDAY_OPTION = 'Public holiday'

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
  const [holidayList, setHolidayList] = useState<PublicHoliday[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [addingHoliday, setAddingHoliday] = useState(false)
  const [holidayName, setHolidayName] = useState('')
  const [holidayErrors, setHolidayErrors] = useState<HolidayErrors>({})
  const [approved, setApproved] = useState<LeaveRequest[]>([])

  const holidays = useMemo(() => holidaysByDate(holidayList), [holidayList])

  const bookingFor = employeeId ?? user?.id ?? null

  const bookingForSomeoneElse =
    canBookForOthers && bookingFor !== null && bookingFor !== user?.id

  useEffect(() => {
    if (!user) return
    let cancelled = false

    listPublicHolidays()
      .then((res) => {
        if (!cancelled) setHolidayList(res)
      })
      .catch(() => {
        if (!cancelled) setHolidayList([])
      })

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (bookingFor === null) return
    let cancelled = false

    getRemainingLeave(bookingFor)
      .then((remaining) => {
        if (!cancelled) setDaysRemaining(remaining.days_remaining)
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

    listUserProfiles()
      .then((profiles) => {
        if (!cancelled) setEmployees(employeeOptions(profiles))
      })
      .catch(() => {
        if (!cancelled) setEmployees([])
      })

    listAllRequests()
      .then((requests) => {
        if (!cancelled) setApproved(Array.isArray(requests) ? requests : [])
      })
      .catch(() => {
        if (!cancelled) setApproved([])
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

  async function addPublicHoliday(): Promise<void> {
    const found = validateHoliday(holidayName, draft.startDate, holidayList)
    setHolidayErrors(found)
    if (found.name || found.date) return

    setSubmitError(null)
    setSubmitting(true)
    try {
      await saveHoliday(holidayName, draft.startDate)
      onBooked?.()
      onClose()
    } catch {
      setSubmitError('Could not add this public holiday. Please try again.')
      setSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()

    if (addingHoliday) {
      await addPublicHoliday()
      return
    }

    const found = validateBooking(draft)
    setErrors(found)
    if (hasBookingErrors(found)) return

    setSubmitError(null)
    setSubmitting(true)
    try {
      const created = await createLeaveRequest(
        buildCreateBody(
          draft,
          canBookForOthers && bookingFor !== null ? bookingFor : undefined
        )
      )
      onBooked?.()
      onClose()
      navigate(REQUESTS_PATH, {
        state: {
          bookingConfirmation: created.message ?? BOOKING_CONFIRMATION_FALLBACK,
          bookingRequestId: created.request.id,
        } satisfies BookingConfirmationState,
      })
    } catch (err) {
      setSubmitError(bookingErrorMessage(err, draft, daysRemaining))
    } finally {
      setSubmitting(false)
    }
  }

  const days = requestedDays(draft, holidays)
  const spanned = holidaysInRange(draft, holidays)
  const clashWarning = addingHoliday
    ? approvedClashWarning(draft.startDate, approved)
    : null

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
      title={addingHoliday ? 'Add a public holiday' : 'Book time off'}
      onClose={onClose}
      description={
        addingHoliday
          ? 'Nobody can book leave on this date once it is saved.'
          : bookingForSomeoneElse
            ? 'This request will be recorded against the employee you choose.'
            : 'Your request will be sent to your manager for approval.'
      }
      primary={{
        label: submitting
          ? 'Saving…'
          : addingHoliday
            ? 'Add public holiday'
            : 'Send request',
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
        {canBookForOthers && !addingHoliday && (
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
          value={addingHoliday ? PUBLIC_HOLIDAY_OPTION : draft.leaveType}
          onChange={(value) => {
            setAddingHoliday(value === PUBLIC_HOLIDAY_OPTION)
            setHolidayErrors({})
            update({
              leaveType:
                value === PUBLIC_HOLIDAY_OPTION ? '' : (value as LeaveType),
            })
          }}
          options={[
            ...LEAVE_TYPES.map((type) => ({ value: type, label: type })),
            ...(canBookForOthers
              ? [{ value: PUBLIC_HOLIDAY_OPTION, label: PUBLIC_HOLIDAY_OPTION }]
              : []),
          ]}
          placeholder="Select leave type"
          error={errors.leaveType}
        />

        {addingHoliday ? (
          <DatePicker
            id="start-date"
            label="Date"
            value={draft.startDate}
            onChange={(startDate) => {
              setHolidayErrors({})
              update({ startDate })
            }}
            holidays={holidays}
            error={holidayErrors.date}
          />
        ) : (
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
        )}

        {addingHoliday ? (
          <InputWithLabel
            id="holiday-name"
            label="Holiday name"
            value={holidayName}
            onChange={(value) => {
              setHolidayName(value)
              setHolidayErrors({})
            }}
            placeholder="Spring bank holiday"
            error={holidayErrors.name}
          />
        ) : (
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
        )}

        {!addingHoliday && days > 0 && (
          <p
            data-testid="booking-summary"
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-sage-background px-4 py-3 text-sm text-sage-foreground"
          >
            <span className="font-medium">{countLabel(days, 'day')}</span>
            {daysRemaining !== null && (
              <span data-testid="booking-remaining">
                {countLabel(
                  remainingAfterRequest(daysRemaining, draft, holidays),
                  'day'
                )}{' '}
                remaining after this request
              </span>
            )}
          </p>
        )}

        {!addingHoliday && spanned.length > 0 && (
          <p
            data-testid="booking-holidays"
            className="rounded-lg bg-pending-background px-4 py-3 text-sm text-pending-foreground"
          >
            {countLabel(spanned.length, 'public holiday')} in this range is not
            counted: {spanned.join(', ')}
          </p>
        )}

        {clashWarning && <FormAlert message={clashWarning} variant="warning" />}

        {submitError && <FormAlert message={submitError} />}
      </form>
    </Modal>
  )
}
