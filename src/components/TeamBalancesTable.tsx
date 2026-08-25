import { useMemo } from 'react'
import DataTable, { type DataTableColumn } from '@/components/DataTable'
import { initialsFromName } from '@/components/UserSummary'
import { countLabel } from '@/lib/dates'
import { REPORTS_COVERAGE_NOTE, type TeamBalance } from '@/lib/teamBalances'

interface TeamBalancesTableProps {
  rows: TeamBalance[] | null
  error?: unknown
  onRetry?: () => void
}

function Employee({ row }: { row: TeamBalance }) {
  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-background text-sm font-semibold text-sage-foreground"
      >
        {initialsFromName(row.name)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-text-primary">
          {row.name}
        </span>
        {row.department_name && (
          <span className="truncate text-sm text-text-secondary">
            {row.department_name}
          </span>
        )}
      </span>
    </span>
  )
}

export default function TeamBalancesTable({
  rows,
  error = null,
  onRetry,
}: TeamBalancesTableProps) {
  const columns = useMemo<DataTableColumn<TeamBalance>[]>(
    () => [
      {
        key: 'name',
        header: 'Employee',
        hideCardLabel: true,
        cell: (row) => <Employee row={row} />,
      },
      {
        key: 'entitlement',
        header: 'Entitlement',
        align: 'right',
        cell: (row) =>
          row.balance === null
            ? 'Unavailable'
            : countLabel(row.balance.annual_allowance, 'day'),
      },
      {
        key: 'used',
        header: 'Days used',
        align: 'right',
        cell: (row) =>
          row.balance === null
            ? 'Unavailable'
            : countLabel(row.balance.days_used, 'day'),
      },
      {
        key: 'remaining',
        header: 'Days remaining',
        align: 'right',
        cell: (row) =>
          row.balance === null ? (
            <span
              data-testid="balance-unavailable"
              className="text-text-secondary"
            >
              Unavailable
            </span>
          ) : (
            <span className="font-medium text-text-primary">
              {countLabel(row.balance.days_remaining, 'day')}
            </span>
          ),
      },
    ],
    []
  )

  return (
    <section
      data-testid="team-balances"
      className="flex flex-col gap-4 rounded-2xl bg-background-secondary p-6 sm:p-8"
    >
      <h2 className="text-2xl">Team leave balances</h2>
      <DataTable
        caption="Leave balances for the people you manage"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.employee_id}
        error={error}
        onRetry={onRetry}
        loadingLabel="Loading team leave balances"
        errorFallbackMessage="Failed to load team leave balances"
        emptyMessage="Nobody on your team has requested or taken leave yet."
      />
      <p
        data-testid="reports-coverage-note"
        className="text-sm text-text-secondary"
      >
        {REPORTS_COVERAGE_NOTE}
      </p>
    </section>
  )
}
