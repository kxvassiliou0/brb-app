export type Role = 'Admin' | 'Manager' | 'Employee'

export const HOME_PATH = '/'

export const REQUESTS_PATH = '/requests'

export const SETTINGS_PATH = '/settings'

export const ADMIN_ROLES: Role[] = ['Admin']

export const MANAGER_ROLES: Role[] = ['Manager']

export const TEAM_ROLES: Role[] = [...MANAGER_ROLES, ...ADMIN_ROLES]

export function canReviewRequests(role: Role | undefined): boolean {
  return role !== undefined && TEAM_ROLES.includes(role)
}

export function isAdmin(role: Role | undefined): boolean {
  return role === 'Admin'
}
