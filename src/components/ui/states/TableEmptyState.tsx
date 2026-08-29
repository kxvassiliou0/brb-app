import type { ReactNode } from 'react'
import { TABLE_ROW_HEIGHT } from './metrics'

interface TableEmptyStateProps {
  columns: number
  message: string
  action?: ReactNode
}

export default function TableEmptyState({
  columns,
  message,
  action,
}: TableEmptyStateProps) {
  return (
    <tbody data-testid="table-empty-state">
      <tr style={{ height: TABLE_ROW_HEIGHT }}>
        <td colSpan={columns}>
          <div
            role="status"
            className="flex flex-col items-center justify-center gap-3 py-6 text-center text-text-secondary"
          >
            <p>{message}</p>
            {action}
          </div>
        </td>
      </tr>
    </tbody>
  )
}
