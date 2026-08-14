import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import PageHeader from '../../components/PageHeader'

interface DepartmentRow {
  id: number
  name: string
}

export default function Departments() {
  const [departments, setDepartments] = useState<DepartmentRow[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setDepartments(null)
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    apiFetch<{ data: DepartmentRow[] }>('/api/departments')
      .then((res) => {
        if (!cancelled) setDepartments(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  return (
    <div data-testid="screen-departments">
      <PageHeader
        title="Departments"
        description="Departments in your organization."
      />
      {error ? (
        <ErrorState
          error={error}
          onRetry={retry}
          fallbackMessage="Failed to load departments"
        />
      ) : departments === null ? (
        <LoadingState label="Loading departments" />
      ) : departments.length === 0 ? (
        <EmptyState message="No departments have been created yet." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <li
              key={d.id}
              className="rounded-xl border border-border-primary bg-background-secondary p-4"
            >
              {d.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
