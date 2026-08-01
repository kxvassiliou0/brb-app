export type Role = 'Admin' | 'Manager' | 'Employee'

export const ROLE_HOME: Record<Role, string> = {
  Admin: '/admin',
  Manager: '/manager',
  Employee: '/employee',
}

export const SUBTREE_ROLES: Record<'admin' | 'employee' | 'manager', Role[]> = {
  admin: ['Admin'],
  employee: ['Employee'],
  manager: ['Manager', 'Admin'],
}
