import { ApiRequestError, apiFetch, getApiErrorMessage } from '@/lib/api'
import { clearApiCache } from '@/lib/apiCache'
import type {
  CreateUserBody,
  RoleType,
  UpdateUserBody,
  UserListItem,
  UserRecord,
} from '@/types/api'

export const PASSWORD_MIN_LENGTH = 10

export const ROLES: RoleType[] = ['Employee', 'Manager', 'Admin']

export const DEFAULT_ANNUAL_LEAVE_ALLOWANCE = 25

export const HTTP_CONFLICT = 409

export const DUPLICATE_EMAIL_MESSAGE =
  'That email address already belongs to someone else. Please use a different one.'

export const KEEP_PASSWORD_HINT =
  'Leave this blank to keep their current password.'

export const SELF_DELETE_MESSAGE = 'You cannot delete your own account'

export const DELETE_ACKNOWLEDGEMENT = 'I understand and want to delete them'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface EmployeeDraft {
  firstName: string
  lastName: string
  email: string
  role: RoleType
  annualLeaveAllowance: string
  departmentId: string
  jobRoleId: string
  managerId: string
  password: string
}

export interface EmployeeErrors {
  firstName?: string
  lastName?: string
  email?: string
  annualLeaveAllowance?: string
  departmentId?: string
  jobRoleId?: string
  managerId?: string
  password?: string
}

export const USERS_PATH = '/api/users'

export function userPath(id: number): string {
  return `${USERS_PATH}/${id}`
}

export function emptyEmployeeDraft(): EmployeeDraft {
  return {
    firstName: '',
    lastName: '',
    email: '',
    role: 'Employee',
    annualLeaveAllowance: String(DEFAULT_ANNUAL_LEAVE_ALLOWANCE),
    departmentId: '',
    jobRoleId: '',
    managerId: '',
    password: '',
  }
}

export function draftFromRecord(record: UserRecord): EmployeeDraft {
  return {
    firstName: record.firstName,
    lastName: record.lastName,
    email: record.email,
    role: record.role,
    annualLeaveAllowance: String(record.annualLeaveAllowance),
    departmentId: String(record.departmentId),
    jobRoleId: String(record.jobRoleId),
    managerId: record.managerId === null ? '' : String(record.managerId),
    password: '',
  }
}

export function validateEmployee(
  draft: EmployeeDraft,
  employeeId?: number
): EmployeeErrors {
  const errors: EmployeeErrors = {}

  if (!draft.firstName.trim()) errors.firstName = 'Please enter a first name'
  if (!draft.lastName.trim()) errors.lastName = 'Please enter a last name'

  if (!draft.email.trim()) errors.email = 'Please enter an email address'
  else if (!EMAIL_PATTERN.test(draft.email.trim()))
    errors.email = 'Please enter a valid email address'

  const allowance = Number(draft.annualLeaveAllowance)
  if (!draft.annualLeaveAllowance.trim())
    errors.annualLeaveAllowance = 'Please enter an annual leave allowance'
  else if (!Number.isInteger(allowance) || allowance <= 0)
    errors.annualLeaveAllowance = 'Enter a whole number of days above zero'

  if (!draft.departmentId) errors.departmentId = 'Please choose a department'
  if (!draft.jobRoleId) errors.jobRoleId = 'Please choose a job role'

  if (
    employeeId !== undefined &&
    draft.managerId &&
    Number(draft.managerId) === employeeId
  ) {
    errors.managerId = 'Someone cannot be their own line manager'
  }

  if (draft.password && draft.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
  }

  return errors
}

export function validateNewEmployee(draft: EmployeeDraft): EmployeeErrors {
  const errors = validateEmployee(draft)
  if (!draft.password) errors.password = 'Please enter a password'
  return errors
}

export function hasEmployeeErrors(errors: EmployeeErrors): boolean {
  return Object.keys(errors).length > 0
}

export function isDuplicateEmailError(error: unknown): boolean {
  if (error instanceof ApiRequestError && error.status === HTTP_CONFLICT)
    return true

  const message = getApiErrorMessage(error, '').toLowerCase()
  if (message.includes('duplicate entry')) return true
  return (
    message.includes('email') &&
    (message.includes('already') ||
      message.includes('unique') ||
      message.includes('taken'))
  )
}

export function buildUpdateBody(draft: EmployeeDraft): UpdateUserBody {
  return {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim(),
    role: draft.role,
    annualLeaveAllowance: Number(draft.annualLeaveAllowance),
    departmentId: Number(draft.departmentId),
    jobRoleId: Number(draft.jobRoleId),
    managerId: draft.managerId ? Number(draft.managerId) : null,
    ...(draft.password ? { password: draft.password } : {}),
  }
}

export function buildCreateBody(draft: EmployeeDraft): CreateUserBody {
  return { ...buildUpdateBody(draft), password: draft.password }
}

export async function createEmployee(draft: EmployeeDraft): Promise<void> {
  await apiFetch(USERS_PATH, {
    method: 'POST',
    body: JSON.stringify(buildCreateBody(draft)),
  })
  clearApiCache()
}

export async function updateEmployee(
  id: number,
  draft: EmployeeDraft
): Promise<void> {
  await apiFetch(userPath(id), {
    method: 'PATCH',
    body: JSON.stringify(buildUpdateBody(draft)),
  })
  clearApiCache()
}

export async function deleteEmployee(id: number): Promise<void> {
  await apiFetch(userPath(id), { method: 'DELETE' })
  clearApiCache()
}

export function fullName(employee: {
  firstName: string
  lastName: string
}): string {
  return `${employee.firstName} ${employee.lastName}`.trim()
}

export function canDeleteEmployee(
  employee: UserListItem,
  currentUserId: number | undefined
): boolean {
  return employee.id !== currentUserId
}

export function directReports(
  employees: UserListItem[],
  managerId: number
): UserListItem[] {
  return employees.filter((employee) => employee.manager?.id === managerId)
}

export function couldHaveReviewed(role: RoleType): boolean {
  return role === 'Manager' || role === 'Admin'
}

export function deletionConsequences(
  employee: UserListItem,
  employees: UserListItem[]
): string[] {
  const name = fullName(employee)
  const reports = directReports(employees, employee.id)
  const consequences = [
    `Every leave request ${name} has made will be deleted along with the account. That history cannot be recovered.`,
  ]

  if (reports.length > 0) {
    const who =
      reports.length === 1
        ? `${fullName(reports[0]!)} reports`
        : `${reports.length} people report`
    consequences.push(
      `${who} to ${name}. They will be kept, but left without a line manager until you assign one.`
    )
  }

  if (couldHaveReviewed(employee.role)) {
    consequences.push(
      `Requests ${name} approved or declined will stay in the history, but will no longer name who reviewed them.`
    )
  }

  return consequences
}
