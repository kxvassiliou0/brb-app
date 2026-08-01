import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import PageHeader from '../../components/PageHeader'

interface EmployeeRow {
  id: number
  firstName: string
  lastName: string
  email: string
  role: string
}

export default function Employees() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetch<{ data: EmployeeRow[] }>('/api/users')
      .then((res) => {
        if (!cancelled) setEmployees(res.data)
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load employees'
          )
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div data-testid="screen-employees">
      <PageHeader
        title="Employees"
        description="Everyone in your organization."
      />
      {error && <p role="alert">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e.id}>
              <td>
                {e.firstName} {e.lastName}
              </td>
              <td>{e.email}</td>
              <td>{e.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
