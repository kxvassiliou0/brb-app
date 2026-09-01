import type { ReactNode } from 'react'
import DateRangeFilter from '@/components/requests/DateRangeFilter'
import Icon from '@/components/ui/Icon'
import type { RequestFilters } from '@/features/requests/requestFilters'
import type { DepartmentRow } from '@/types/api'

export const CLEAR_FILTERS_LABEL = 'Clear filters'

const FILTER_CONTROL =
  'touch-target w-full rounded-xl border border-border-primary bg-background-secondary py-2 text-base text-text-primary placeholder:text-text-secondary'

interface RequestsToolbarProps {
  filters: RequestFilters
  onChange: (patch: Partial<RequestFilters>) => void
  onClear: () => void
  canClear: boolean
  showSearch: boolean
  showDepartments: boolean
  departments: DepartmentRow[]
  trailing?: ReactNode
}

export default function RequestsToolbar({
  filters,
  onChange,
  onClear,
  canClear,
  showSearch,
  showDepartments,
  departments,
  trailing,
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

      {showSearch && (
        <div className="relative flex min-w-0 flex-1 items-center sm:max-w-sm">
          <label htmlFor="filter-search" className="sr-only">
            Search by employee
          </label>
          <span className="pointer-events-none absolute left-4 flex text-text-primary">
            <Icon name="search" />
          </span>
          <input
            id="filter-search"
            type="search"
            value={filters.search}
            placeholder="Search by employee…"
            onChange={(event) => onChange({ search: event.target.value })}
            className={`${FILTER_CONTROL} pr-4 pl-12`}
          />
        </div>
      )}

      {showDepartments && (
        <div className="relative flex min-w-0 items-center">
          <label htmlFor="filter-department" className="sr-only">
            Filter by department
          </label>
          <select
            id="filter-department"
            value={filters.departmentId ?? ''}
            onChange={(event) =>
              onChange({
                departmentId: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
            className={`${FILTER_CONTROL} appearance-none pr-12 pl-4`}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 flex text-text-primary">
            <Icon name="chevronDown" />
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onClear}
        data-testid="clear-filters"
        className={`touch-target inline-flex items-center rounded-full px-4 text-sm font-medium text-text-primary underline decoration-1 underline-offset-4 hover:bg-background-tertiary ${
          canClear ? '' : 'pointer-events-none invisible'
        }`}
      >
        {CLEAR_FILTERS_LABEL}
      </button>

      {trailing && <div className="ms-auto">{trailing}</div>}
    </div>
  )
}
