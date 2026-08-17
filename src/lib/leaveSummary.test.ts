import { describe, expect, it } from 'vitest'
import { countDays, formatDateRange } from '@/lib/dates'
import { greetByName } from '@/lib/greeting'
import { recentRequests, summariseRequests } from '@/lib/leaveSummary'
import { getLeaveYear, isWithinLeaveYear } from '@/lib/leaveYear'
import type { LeaveStatus, LeaveType, OwnLeaveRequest } from '@/types/api'

function request(
  id: number,
  start_date: string,
  end_date: string,
  leave_type: LeaveType = 'Vacation',
  status: LeaveStatus = 'Approved'
): OwnLeaveRequest {
  return {
    id,
    leave_type,
    start_date,
    end_date,
    days_requested: countDays(start_date, end_date),
    date_requested: start_date,
    status,
    reason: null,
    manager_note: null,
  }
}

describe('getLeaveYear', () => {
  it('runs from 1 April to 31 March for a date after April', () => {
    expect(getLeaveYear(new Date(2026, 6, 15))).toEqual({
      start: '2026-04-01',
      end: '2027-03-31',
    })
  })

  it('belongs to the previous April for a date before April', () => {
    expect(getLeaveYear(new Date(2026, 0, 5))).toEqual({
      start: '2025-04-01',
      end: '2026-03-31',
    })
  })

  it('places both boundary days inside the year and neighbours outside', () => {
    const leaveYear = getLeaveYear(new Date(2026, 6, 15))
    expect(isWithinLeaveYear('2026-04-01', leaveYear)).toBe(true)
    expect(isWithinLeaveYear('2027-03-31', leaveYear)).toBe(true)
    expect(isWithinLeaveYear('2026-03-31', leaveYear)).toBe(false)
    expect(isWithinLeaveYear('2027-04-01', leaveYear)).toBe(false)
  })
})

describe('countDays', () => {
  it('counts calendar days inclusively, weekends included', () => {
    expect(countDays('2026-05-01', '2026-05-04')).toBe(4)
  })

  it('counts a single day as one', () => {
    expect(countDays('2026-05-01', '2026-05-01')).toBe(1)
  })
})

describe('summariseRequests', () => {
  const reference = new Date(2026, 6, 15)

  it('counts approved requests booked inside the leave year', () => {
    const summary = summariseRequests(
      [
        request(1, '2026-05-01', '2026-05-05'),
        request(2, '2026-02-01', '2026-02-05'),
        request(3, '2026-06-01', '2026-06-02', 'Vacation', 'Rejected'),
      ],
      reference
    )
    expect(summary.bookedRequests).toBe(1)
  })

  it('counts every pending request awaiting a manager', () => {
    const summary = summariseRequests(
      [
        request(1, '2026-05-01', '2026-05-05', 'Vacation', 'Pending'),
        request(2, '2026-09-01', '2026-09-05', 'Sick', 'Pending'),
        request(3, '2026-06-01', '2026-06-02'),
      ],
      reference
    )
    expect(summary.pendingRequests).toBe(2)
  })

  it('sums only approved Sick days from the current leave year', () => {
    const summary = summariseRequests(
      [
        request(1, '2026-06-01', '2026-06-03', 'Sick'),
        request(2, '2026-05-01', '2026-05-10', 'Vacation'),
        request(3, '2026-01-01', '2026-01-05', 'Sick'),
        request(4, '2026-08-01', '2026-08-04', 'Sick', 'Pending'),
      ],
      reference
    )
    expect(summary.sickDays).toBe(3)
  })
})

describe('recentRequests', () => {
  it('orders by start date descending and caps the list', () => {
    const ordered = recentRequests(
      [
        request(1, '2026-04-01', '2026-04-02'),
        request(2, '2026-08-01', '2026-08-02'),
        request(3, '2026-06-01', '2026-06-02'),
      ],
      2
    )
    expect(ordered.map((r) => r.id)).toEqual([2, 3])
  })

  it('leaves the source array untouched', () => {
    const requests = [
      request(1, '2026-04-01', '2026-04-02'),
      request(2, '2026-08-01', '2026-08-02'),
    ]
    recentRequests(requests)
    expect(requests.map((r) => r.id)).toEqual([1, 2])
  })
})

describe('formatDateRange', () => {
  it('collapses a single-day range to one date', () => {
    expect(formatDateRange('2026-02-02', '2026-02-02')).toBe('2 Feb 2026')
  })

  it('renders a multi-day range as a span', () => {
    expect(formatDateRange('2026-08-10', '2026-08-21')).toBe(
      '10 Aug 2026 – 21 Aug 2026'
    )
  })
})

describe('greetByName', () => {
  it('greets by time of day', () => {
    expect(greetByName('Priya', new Date(2026, 6, 15, 9))).toBe(
      'Good morning, Priya'
    )
    expect(greetByName('Priya', new Date(2026, 6, 15, 13))).toBe(
      'Good afternoon, Priya'
    )
    expect(greetByName('Priya', new Date(2026, 6, 15, 20))).toBe(
      'Good evening, Priya'
    )
  })

  it('drops the name when the profile has not arrived', () => {
    expect(greetByName(undefined, new Date(2026, 6, 15, 9))).toBe(
      'Good morning'
    )
  })
})
