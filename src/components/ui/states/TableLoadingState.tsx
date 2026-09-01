import Skeleton from './Skeleton'
import { DEFAULT_SKELETON_ROWS, TABLE_ROW_HEIGHT } from './metrics'

interface TableLoadingStateProps {
  columns: number
  label?: string
}

export default function TableLoadingState({
  columns,
  label = 'Loading',
}: TableLoadingStateProps) {
  return (
    <tbody data-testid="table-loading-state" aria-busy="true">
      {Array.from({ length: DEFAULT_SKELETON_ROWS }, (_, row) => (
        <tr key={row} style={{ height: TABLE_ROW_HEIGHT }}>
          {Array.from({ length: columns }, (_, column) => (
            <td key={column}>
              {row === 0 && column === 0 && (
                <span role="status" className="sr-only">
                  {label}
                </span>
              )}
              <Skeleton width={column === columns - 1 ? '50%' : '80%'} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}
