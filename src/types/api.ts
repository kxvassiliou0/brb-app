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

export interface UserRelation {
  id: number
  name: string
}

export interface DepartmentRow {
  id: number
  name: string
}

export type JobRoleRow = DepartmentRow

export interface UserProfile {
  id: number
  firstName: string
  lastName: string
  email: string
  role: RoleType
  annualLeaveAllowance: number
  department: UserRelation
  jobRole: UserRelation
}

export interface UserListItem extends UserProfile {
  manager: UserRelation | null
}

export interface UserRecord {
  id: number
  firstName: string
  lastName: string
  email: string
  role: RoleType
  annualLeaveAllowance: number
  departmentId: number
  jobRoleId: number
  managerId: number | null
}

export type UpdateUserBody = Omit<UserRecord, 'id'> & { password?: string }

export type CreateUserBody = Omit<UserRecord, 'id'> & { password: string }

export interface LeaveRequest {
  id: number
  employee_id: number
  employee_name: string | null
  department_id: number | null
  department_name: string | null
  leave_type: LeaveType
  start_date: string
  end_date: string
  days_requested: number
  date_requested: string | null
  status: LeaveStatus
  reason: string | null
  manager_note: string | null
  reviewed_by_name: string | null
}

export interface OwnLeaveRequest {
  id: number
  leave_type: LeaveType
  start_date: string
  end_date: string
  days_requested: number
  date_requested: string | null
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
  status: LeaveStatus
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

export interface DeleteLeaveRequestResult extends LeaveRequest {
  days_restored?: number
  new_days_remaining?: number
}

export interface LoginBody {
  email: string
  password: string
}
