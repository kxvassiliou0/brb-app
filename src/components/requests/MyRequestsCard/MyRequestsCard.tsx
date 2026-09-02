import { useMemo } from 'react'
import { Link } from 'react-router'
import BookTimeOffButton from '@/components/requests/BookTimeOffButton'
import Card from '@/components/ui/Card'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import StatusPill from '@/components/ui/StatusPill'
import { recentRequests } from '@/features/requests/leaveSummary'
import { formatDateRange } from '@/lib/dates'
import { REQUESTS_PATH } from '@/lib/routeAccess'
import type { OwnLeaveRequest } from '@/types/api'

interface MyRequestsCardProps {
  requests: OwnLeaveRequest[]
  onBooked: () => void
}

export default function MyRequestsCard({
  requests,
  onBooked,
}: MyRequestsCardProps) {
  const columns = useMemo<DataTableColumn<OwnLeaveRequest>[]>(
    () => [
      { key: 'type', header: 'Type', cell: (r) => r.leave_type },
      {
        key: 'dates',
        header: 'Dates',
        cell: (r) => formatDateRange(r.start_date, r.end_date),
      },
      { key: 'days', header: 'Days', cell: (r) => r.days_requested },
      {
        key: 'status',
        header: 'Status',
        cell: (r) => <StatusPill status={r.status} />,
      },
    ],
    []
  )

  const recent = useMemo(() => recentRequests(requests), [requests])

  return (
    <Card variant="bordered" size="sm" labelledBy="recent-requests-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="recent-requests-heading" className="text-xl md:text-2xl">
          My requests
        </h2>
        <Link
          to={`${REQUESTS_PATH}?scope=mine`}
          className="touch-target inline-flex items-center rounded-full px-3 text-base font-medium text-text-primary underline decoration-1 underline-offset-4 hover:bg-background-tertiary"
        >
          View all
        </Link>
      </div>
      <DataTable
        caption="My most recent time-off requests"
        columns={columns}
        rows={recent}
        rowKey={(r) => r.id}
        emptyMessage="You have not requested any time off yet, so there is nothing to summarise."
        emptyAction={<BookTimeOffButton onBooked={onBooked} />}
      />
    </Card>
  )
}
