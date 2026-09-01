import EmployeeFormModal, {
  ADD_EMPLOYEE_LABEL,
} from '@/components/employees/EmployeeFormModal'
import DeleteEmployeeModal from '@/components/employees/DeleteEmployeeModal'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import Icon from '@/components/ui/Icon'
import { listUsers } from '@/api/users'
import { useResource } from '@/api/useResource'
import { useAuth } from '@/features/auth/auth'
import { countLabel } from '@/lib/dates'
import {
  canDeleteEmployee,
  fullName,
  SELF_DELETE_MESSAGE,
} from '@/features/employees/employeeAdmin'
import type { UserListItem } from '@/types/api'
import { useMemo, useState } from 'react'

function managerName(employee: UserListItem): string {
  return employee.manager?.name.trim() ? employee.manager.name : 'None'
}

function describeRoster(employees: UserListItem[] | null): string {
  if (employees === null) return 'Everyone in your organisation.'
  const departments = new Set(
    employees.map((employee) => employee.department.id)
  )
  const people = employees.length === 1 ? 'person' : 'people'
  return `${employees.length} ${people} across ${countLabel(departments.size, 'department')}`
}

export default function Employees() {
  const { user } = useAuth()
  const { data: employees, error, retry } = useResource(listUsers)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const find = (id: number | null): UserListItem | undefined =>
    id === null
      ? undefined
      : (employees?.find((row) => row.id === id) ?? undefined)

  const editing = find(editingId)
  const deleting = find(deletingId)

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
        cell: (employee) => {
          const name = fullName(employee)
          const deletable = canDeleteEmployee(employee, user?.id)
          return (
            <div className="flex items-center justify-end">
              <Button variant="ghost" onClick={() => setEditingId(employee.id)}>
                <Icon name="pencil" />
                <span className="sr-only">Edit {name}</span>
              </Button>
              <Button
                variant="ghostDanger"
                disabled={!deletable}
                title={deletable ? undefined : SELF_DELETE_MESSAGE}
                onClick={() => setDeletingId(employee.id)}
              >
                <Icon name="trash" />
                <span className="sr-only">
                  {deletable
                    ? `Delete ${name}`
                    : `Delete ${name} (${SELF_DELETE_MESSAGE})`}
                </span>
              </Button>
            </div>
          )
        },
      },
    ],
    [user?.id]
  )

  return (
    <div data-testid="screen-employees">
      <PageHeader
        title="Employees"
        description={describeRoster(employees)}
        action={
          <Button onClick={() => setAdding(true)}>
            <Icon name="plus" />
            {ADD_EMPLOYEE_LABEL}
          </Button>
        }
      />
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

      {adding && (
        <EmployeeFormModal
          employees={employees ?? []}
          onClose={() => setAdding(false)}
          onSaved={retry}
        />
      )}

      {editing && employees && (
        <EmployeeFormModal
          employee={editing}
          employees={employees}
          onClose={() => setEditingId(null)}
          onSaved={retry}
        />
      )}

      {deleting && employees && (
        <DeleteEmployeeModal
          employee={deleting}
          employees={employees}
          onClose={() => setDeletingId(null)}
          onDeleted={retry}
        />
      )}
    </div>
  )
}
