export type LeaveType = 'Vacation' | 'Sick' | 'Personal'

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'

export type RoleType = 'Admin' | 'Manager' | 'Employee'

export interface ApiSuccess<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
}

export interface LeaveRequest {
  id: number
  employee_id: number
  leave_type: LeaveType
  start_date: string
  end_date: string
  status: LeaveStatus
  reason: string | null
  manager_note: string | null
}

export interface ExcludedPublicHoliday {
  date: string
  name: string
}

export interface CreateLeaveRequestResult extends LeaveRequest {
  days_requested: number
  excluded_public_holidays: ExcludedPublicHoliday[]
}

export interface OwnLeaveRequest {
  id: number
  leave_type: LeaveType
  start_date: string
  end_date: string
  status: LeaveStatus
  reason: string | null
  manager_note: string | null
}

export interface RemainingLeave {
  annual_allowance: number
  days_used: number
  days_remaining: number
}

export interface CalendarEntry {
  employee_id: number
  name: string
  department_id: number
  leave_type: LeaveType
  start_date: string
  end_date: string
}

export interface LeaveUsageEmployee {
  employee_id: number
  name: string
  department_id: number
  breakdown: Record<LeaveType, number>
  total_days_used: number
}

export interface LeaveUsageReport {
  scope: string
  employees: LeaveUsageEmployee[]
}

export interface CreateLeaveRequestBody {
  employee_id?: number
  start_date: string
  end_date: string
  leave_type: LeaveType
  reason?: string
}

export interface DeleteLeaveRequestBody {
  leave_request_id: number
  employee_id?: number
  reason?: string
}

export interface ReviewLeaveRequestBody {
  leave_request_id: number
  reason?: string
}

export interface DeleteLeaveRequestResult {
  leave_request_id: number
  employee_id: number
  status: LeaveStatus
  new_days_remaining?: number
}

export interface LoginBody {
  email: string
  password: string
}
