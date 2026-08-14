import type { LeaveStatus } from '@/types/api'

const TONE: Record<LeaveStatus, string> = {
  Approved: 'bg-sage-background text-sage-foreground',
  Pending: 'bg-pending-background text-pending-foreground',
  Rejected: 'bg-error-background text-error-foreground',
  Cancelled: 'bg-background-tertiary text-text-primary',
}

interface StatusPillProps {
  status: LeaveStatus
}

export default function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${TONE[status]}`}
    >
      {status}
    </span>
  )
}
