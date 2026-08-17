import DateRangeFilter from '@/components/DateRangeFilter'
import { CONTROL_CLASS } from '@/components/InputWithLabel'
import type { RequestFilters } from '@/lib/requestFilters'
import type { DepartmentRow } from '@/types/api'

interface RequestsToolbarProps {
  filters: RequestFilters
  onChange: (patch: Partial<RequestFilters>) => void
  onClear: () => void
  showEmployeeFilters: boolean
  departments: DepartmentRow[]
  canClear: boolean
}

export default function RequestsToolbar({
  filters,
  onChange,
  onClear,
  showEmployeeFilters,
  departments,
  canClear,
}: RequestsToolbarProps) {
  return (
    <div
      data-testid="requests-toolbar"
      className="flex flex-wrap items-center gap-3"
    >
      <DateRangeFilter
        from={filters.from}
        to={filters.to}
        onChange={onChange}
      />

      {showEmployeeFilters && (
        <>
          <input
            id="filter-search"
            type="search"
            aria-label="Search by employee"
            value={filters.search}
            placeholder="Search by employee…"
            onChange={(event) => onChange({ search: event.target.value })}
            className={`${CONTROL_CLASS} w-auto min-w-0 flex-1 py-2 text-sm sm:max-w-xs`}
          />

          <select
            id="filter-department"
            aria-label="Filter by department"
            value={filters.departmentId ?? ''}
            onChange={(event) =>
              onChange({
                departmentId: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
            className={`${CONTROL_CLASS} w-auto rounded-full py-2 text-sm`}
          >
            <option value="">Department: All</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </>
      )}

      {canClear && (
        <button
          type="button"
          onClick={onClear}
          className="touch-target inline-flex items-center rounded-full px-4 text-sm font-medium text-text-primary underline decoration-1 underline-offset-4 hover:bg-background-tertiary"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
