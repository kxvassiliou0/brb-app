import { get, patch, post, remove } from '@/api/client'
import type { DepartmentRow, JobRoleRow } from '@/types/api'

export interface OrgUnitOperations<T> {
  list: () => Promise<T[]>
  create: (name: string) => Promise<void>
  rename: (id: number, name: string) => Promise<void>
  remove: (id: number) => Promise<void>
}

function operations<T>(basePath: string): OrgUnitOperations<T> {
  return {
    list: () => get<T[]>(basePath),
    create: (name) => post(basePath, { name }),
    rename: (id, name) => patch(`${basePath}/${id}`, { name }),
    remove: (id) => remove(`${basePath}/${id}`),
  }
}

export const departments = operations<DepartmentRow>('/api/departments')

export const jobRoles = operations<JobRoleRow>('/api/job-roles')

export const listDepartments = departments.list

export const listJobRoles = jobRoles.list
