import { useMemo } from 'react'
import DataTable, { type DataTableColumn } from '@/components/DataTable'
import PageHeader from '@/components/PageHeader'
import { useApiResource } from '@/lib/useApiResource'
import type { ApiSuccess } from '@/types/api'

interface EmployeeRow {
  id: number
  firstName: string
  lastName: string
  email: string
  role: string
}

export default function Employees() {
  const { data, error, retry } =
    useApiResource<ApiSuccess<EmployeeRow[]>>('/api/users')

  const columns = useMemo<DataTableColumn<EmployeeRow>[]>(
    () => [
      {
        key: 'name',
        header: 'Name',
        cell: (e) => `${e.firstName} ${e.lastName}`,
      },
      { key: 'email', header: 'Email', cell: (e) => e.email },
      { key: 'role', header: 'Role', cell: (e) => e.role },
    ],
    []
  )

  return (
    <div data-testid="screen-employees">
      <PageHeader
        title="Employees"
        description="Everyone in your organization."
      />
      <DataTable
        caption="Employees"
        columns={columns}
        rows={data?.data ?? null}
        rowKey={(e) => e.id}
        error={error}
        onRetry={retry}
        loadingLabel="Loading employees"
        errorFallbackMessage="Failed to load employees"
        emptyMessage="No employees have been added yet."
      />
    </div>
  )
}
