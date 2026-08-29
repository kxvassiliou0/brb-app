import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states'
import PageHeader from '@/components/layout/PageHeader'
import { useApiResource } from '@/lib/useApiResource'
import type { ApiSuccess, DepartmentRow } from '@/types/api'

export default function Departments() {
  const { data, error, retry } =
    useApiResource<ApiSuccess<DepartmentRow[]>>('/api/departments')

  const departments = data?.data ?? null

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
          {departments.map((department) => (
            <li
              key={department.id}
              className="rounded-xl border border-border-primary bg-background-secondary p-4"
            >
              {department.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
