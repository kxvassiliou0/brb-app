import { StatusCodes } from 'http-status-codes'
import { describe, expect, it } from 'vitest'
import { ApiRequestError } from '@/api/client'
import {
  bookingErrorMessage,
  buildCreateBody,
  hasBookingErrors,
  INVALID_DATES_MESSAGE,
  LEAVE_TYPES,
  remainingAfterRequest,
  requestedDays,
  validateBooking,
  type BookingDraft,
} from '@/features/requests/booking'
import { countDays, toIsoDate } from '@/lib/dates'

function draft(overrides: Partial<BookingDraft> = {}): BookingDraft {
  return {
    leaveType: 'Vacation',
    startDate: '2026-08-10',
    endDate: '2026-08-14',
    reason: '',
    ...overrides,
  }
}

describe('inclusive day count', () => {
  it('counts a single day as one day', () => {
    expect(countDays('2026-08-10', '2026-08-10')).toBe(1)
    expect(
      requestedDays(draft({ startDate: '2026-08-10', endDate: '2026-08-10' }))
    ).toBe(1)
  })

  it('counts Monday to Friday as five days', () => {
    expect(
      requestedDays(draft({ startDate: '2026-08-10', endDate: '2026-08-14' }))
    ).toBe(5)
  })

  it('counts Friday to Monday as four days, weekend included', () => {
    expect(
      requestedDays(draft({ startDate: '2026-08-14', endDate: '2026-08-17' }))
    ).toBe(4)
  })

  it('counts calendar days rather than working days across a fortnight', () => {
    expect(
      requestedDays(draft({ startDate: '2026-08-10', endDate: '2026-08-23' }))
    ).toBe(14)
  })

  it('reports the balance left once the request is taken off it', () => {
    expect(
      remainingAfterRequest(
        18,
        draft({ startDate: '2026-08-10', endDate: '2026-08-14' })
      )
    ).toBe(13)
  })
})

describe('leave type options', () => {
  it('offers exactly Vacation, Sick and Personal', () => {
    expect([...LEAVE_TYPES]).toEqual(['Vacation', 'Sick', 'Personal'])
  })

  it('does not offer the retired Business Trip and Conference types', () => {
    expect(LEAVE_TYPES).not.toContain('Business Trip')
    expect(LEAVE_TYPES).not.toContain('Conference')
  })
})

describe('date serialisation', () => {
  it('sends dates as YYYY-MM-DD', () => {
    const body = buildCreateBody(
      draft({ startDate: '2026-08-10', endDate: '2026-08-21' })
    )
    expect(body.start_date).toBe('2026-08-10')
    expect(body.end_date).toBe('2026-08-21')
    expect(body.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(body.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('pads single digit months and days', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('strips any time portion rather than shifting the day', () => {
    expect(toIsoDate('2026-08-10T00:00:00.000Z')).toBe('2026-08-10')
  })

  it('attaches an optional reason and drops an empty one', () => {
    expect(
      buildCreateBody(draft({ reason: '  Family holiday  ' })).reason
    ).toBe('Family holiday')
    expect(buildCreateBody(draft({ reason: '   ' })).reason).toBeUndefined()
  })

  it('passes employee_id only when one is supplied', () => {
    expect(buildCreateBody(draft()).employee_id).toBeUndefined()
    expect(buildCreateBody(draft(), 7).employee_id).toBe(7)
  })
})

describe('validation before submission', () => {
  it('blocks an end date before the start date', () => {
    const errors = validateBooking(
      draft({ startDate: '2026-08-14', endDate: '2026-08-10' })
    )
    expect(hasBookingErrors(errors)).toBe(true)
    expect(errors.endDate).toBe('End date must be on or after the start date')
  })

  it('accepts an end date equal to the start date', () => {
    const errors = validateBooking(
      draft({ startDate: '2026-08-10', endDate: '2026-08-10' })
    )
    expect(hasBookingErrors(errors)).toBe(false)
  })

  it('requires a leave type and both dates', () => {
    const errors = validateBooking(
      draft({ leaveType: '', startDate: '', endDate: '' })
    )
    expect(errors.leaveType).toBe('Please select a leave type')
    expect(errors.startDate).toBe('Please choose a start date')
    expect(errors.endDate).toBe('Please choose an end date')
  })
})

describe('server error messages', () => {
  it('explains a 409 overlap as a clash with an existing request', () => {
    const message = bookingErrorMessage(
      new ApiRequestError(
        'Date range of request overlaps with existing request',
        StatusCodes.CONFLICT
      ),
      draft(),
      18
    )
    expect(message).toContain('clash')
    expect(message).toContain('overlap')
    expect(message).not.toContain('remaining')
  })

  it('quotes the balance when a 400 says the request exceeds it', () => {
    const message = bookingErrorMessage(
      new ApiRequestError(
        'Days requested exceed remaining balance',
        StatusCodes.BAD_REQUEST
      ),
      draft({ startDate: '2026-08-10', endDate: '2026-08-14' }),
      3
    )
    expect(message).toContain('3 days remaining')
    expect(message).toContain('5 days')
  })

  it('keeps a 400 balance message readable when only one day is left', () => {
    const message = bookingErrorMessage(
      new ApiRequestError(
        'Days requested exceed remaining balance',
        StatusCodes.BAD_REQUEST
      ),
      draft({ startDate: '2026-08-10', endDate: '2026-08-14' }),
      1
    )
    expect(message).toContain('1 day remaining')
  })

  it('passes any other server message through unchanged', () => {
    const message = bookingErrorMessage(
      new ApiRequestError('Invalid employee ID', StatusCodes.BAD_REQUEST),
      draft(),
      18
    )
    expect(message).toBe('Invalid employee ID')
  })

  it.each([
    'Dates must be in YYYY-MM-DD format',
    'Invalid date format',
    'End date of 2026-08-01 is before the start date of 2026-08-10',
  ])('explains a 400 about the dates in plain language: %s', (serverError) => {
    const message = bookingErrorMessage(
      new ApiRequestError(serverError, StatusCodes.BAD_REQUEST),
      draft(),
      18
    )
    expect(message).toBe(INVALID_DATES_MESSAGE)
    expect(message).not.toContain('YYYY-MM-DD')
  })

  it('gives the three backend refusals three different messages', () => {
    const balance = bookingErrorMessage(
      new ApiRequestError(
        'Days requested exceed remaining balance',
        StatusCodes.BAD_REQUEST
      ),
      draft({ startDate: '2026-08-10', endDate: '2026-08-14' }),
      3
    )
    const overlap = bookingErrorMessage(
      new ApiRequestError(
        'Date range of request overlaps with existing request',
        StatusCodes.CONFLICT
      ),
      draft({ startDate: '2026-08-10', endDate: '2026-08-14' }),
      3
    )
    const dates = bookingErrorMessage(
      new ApiRequestError('Invalid date format', StatusCodes.BAD_REQUEST),
      draft({ startDate: '2026-08-10', endDate: '2026-08-14' }),
      3
    )

    expect(new Set([balance, overlap, dates]).size).toBe(3)
    expect(balance).toMatch(/remaining/)
    expect(overlap).toMatch(/clash/)
    expect(dates).toBe(INVALID_DATES_MESSAGE)
  })

  it('still names the balance when the balance lookup failed', () => {
    const message = bookingErrorMessage(
      new ApiRequestError(
        'Days requested exceed remaining balance',
        StatusCodes.BAD_REQUEST
      ),
      draft({ startDate: '2026-08-10', endDate: '2026-08-14' }),
      null
    )
    expect(message).toMatch(/balance/i)
  })
})
