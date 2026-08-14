import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/api'
import DataTable, { type DataTableColumn } from '@/components/DataTable'
import PageHeader from '../../components/PageHeader'

interface EmployeeRow {
  id: number
  firstName: string
  lastName: string
  email: string
  role: string
}

export default function Employees() {
  const [employees, setEmployees] = useState<EmployeeRow[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setEmployees(null)
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    apiFetch<{ data: EmployeeRow[] }>('/api/users')
      .then((res) => {
        if (!cancelled) setEmployees(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

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
        rows={employees}
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
