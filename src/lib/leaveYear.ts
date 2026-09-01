const LEAVE_YEAR_START_MONTH = 3

const LEAVE_YEAR_START_DAY = 1

const LEAVE_YEAR_END_MONTH = 2

const LEAVE_YEAR_END_DAY = 31

export const LEAVE_YEAR_LABEL = 'Leave year 1 April to 31 March'

export const LEAVE_YEAR_RESET_LABEL = 'resets 1 April'

interface LeaveYear {
  start: string
  end: string
}

function dateKey(year: number, month: number, day: number): string {
  const paddedMonth = String(month + 1).padStart(2, '0')
  const paddedDay = String(day).padStart(2, '0')
  return `${year}-${paddedMonth}-${paddedDay}`
}

export function getLeaveYear(reference: Date = new Date()): LeaveYear {
  const startYear =
    reference.getMonth() >= LEAVE_YEAR_START_MONTH
      ? reference.getFullYear()
      : reference.getFullYear() - 1
  return {
    start: dateKey(startYear, LEAVE_YEAR_START_MONTH, LEAVE_YEAR_START_DAY),
    end: dateKey(startYear + 1, LEAVE_YEAR_END_MONTH, LEAVE_YEAR_END_DAY),
  }
}

export function isWithinLeaveYear(date: string, leaveYear: LeaveYear): boolean {
  return date >= leaveYear.start && date <= leaveYear.end
}
