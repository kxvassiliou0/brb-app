import DateRangeFilter from '@/components/DateRangeFilter'
import Icon from '@/components/Icon'
import SearchInput from '@/components/SearchInput'
import type { RequestFilters } from '@/lib/requestFilters'
import type { DepartmentRow } from '@/types/api'

interface RequestsToolbarProps {
  filters: RequestFilters
  onChange: (patch: Partial<RequestFilters>) => void
  onClear: () => void
  canClear: boolean
  showSearch: boolean
  showDepartments: boolean
  departments: DepartmentRow[]
}

export default function RequestsToolbar({
  filters,
  onChange,
  onClear,
  canClear,
  showSearch,
  showDepartments,
  departments,
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
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <SearchInput
            id="filter-search"
            label="Search by employee"
            placeholder="Search by employee…"
            value={filters.search}
            onChange={(search) => onChange({ search })}
          />
        </div>
      )}

      {showDepartments && (
        <div className="relative flex min-w-0 items-center">
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
            className="touch-target w-full appearance-none rounded-xl border border-border-primary bg-background-secondary py-3 pr-12 pl-4 text-base text-text-primary"
          >
            <option value="">Department: All</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                Department: {department.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 flex text-text-primary">
            <Icon name="plus" />
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
        Clear filters
      </button>
    </div>
  )
}
