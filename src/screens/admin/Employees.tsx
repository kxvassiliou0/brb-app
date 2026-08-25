import { useMemo } from 'react'
import Button from '@/components/Button'
import DataTable, { type DataTableColumn } from '@/components/DataTable'
import Icon from '@/components/Icon'
import PageHeader from '@/components/PageHeader'
import { countLabel } from '@/lib/dates'
import { useApiResource } from '@/lib/useApiResource'
import type { ApiSuccess, UserListItem } from '@/types/api'

export const NO_MANAGER = 'None'

export function fullName(employee: UserListItem): string {
  return `${employee.firstName} ${employee.lastName}`
}

export function managerName(employee: UserListItem): string {
  return employee.manager?.name.trim() ? employee.manager.name : NO_MANAGER
}

export function describeRoster(employees: UserListItem[] | null): string {
  if (employees === null) return 'Everyone in your organization.'
  const departments = new Set(
    employees.map((employee) => employee.department.id)
  )
  const people = employees.length === 1 ? 'person' : 'people'
  return `${employees.length} ${people} across ${countLabel(departments.size, 'department')}`
}

export default function Employees() {
  const { data, error, retry } =
    useApiResource<ApiSuccess<UserListItem[]>>('/api/users')

  const employees = data?.data ?? null

  const columns = useMemo<DataTableColumn<UserListItem>[]>(
    () => [
      {
        key: 'name',
        header: 'Employee name',
        cell: (employee) => (
          <span
            data-testid="employee-name"
            className="font-medium text-text-primary"
          >
            {fullName(employee)}
          </span>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        cell: (employee) => (
          <span className="wrap-anywhere text-text-secondary">
            {employee.email}
          </span>
        ),
      },
      {
        key: 'department',
        header: 'Department',
        cell: (employee) => employee.department.name,
      },
      {
        key: 'jobRole',
        header: 'Job role',
        cell: (employee) => employee.jobRole.name,
      },
      {
        key: 'manager',
        header: 'Line manager',
        cell: (employee) => (
          <span
            data-testid="employee-manager"
            className={
              employee.manager ? undefined : 'text-text-secondary italic'
            }
          >
            {managerName(employee)}
          </span>
        ),
      },
      {
        key: 'allowance',
        header: 'Annual leave',
        align: 'right',
        cell: (employee) => (
          <span className="whitespace-nowrap">
            {countLabel(employee.annualLeaveAllowance, 'day')}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        hideCardLabel: true,
        align: 'right',
        cell: (employee) => (
          <div className="flex items-center justify-end">
            <Button variant="ghost">
              <Icon name="pencil" />
              <span className="sr-only">Edit {fullName(employee)}</span>
            </Button>
            <Button variant="ghostDanger">
              <Icon name="trash" />
              <span className="sr-only">Delete {fullName(employee)}</span>
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  return (
    <div data-testid="screen-employees">
      <PageHeader title="Employees" description={describeRoster(employees)} />
      <div className="rounded-2xl bg-background-secondary p-4 sm:p-6">
        <DataTable
          caption="Employees"
          columns={columns}
          rows={employees}
          rowKey={(employee) => employee.id}
          error={error}
          onRetry={retry}
          loadingLabel="Loading employees"
          errorFallbackMessage="Failed to load employees"
          emptyMessage="No employees have been added yet."
        />
      </div>
    </div>
  )
}
