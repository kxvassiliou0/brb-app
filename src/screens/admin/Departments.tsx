import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import PageHeader from '../../components/PageHeader'

interface DepartmentRow {
  id: number
  name: string
}

export default function Departments() {
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetch<{ data: DepartmentRow[] }>('/api/departments')
      .then((res) => {
        if (!cancelled) setDepartments(res.data)
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load departments'
          )
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div data-testid="screen-departments">
      <PageHeader
        title="Departments"
        description="Departments in your organization."
      />
      {error && <p role="alert">{error}</p>}
      <ul>
        {departments.map((d) => (
          <li key={d.id}>{d.name}</li>
        ))}
      </ul>
    </div>
  )
}
