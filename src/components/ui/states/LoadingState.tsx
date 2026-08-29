import Skeleton from './Skeleton'
import { DEFAULT_SKELETON_ROWS, STATE_MIN_HEIGHT } from './metrics'

interface LoadingStateProps {
  label?: string
  lines?: number
  minHeight?: string
}

export default function LoadingState({
  label = 'Loading',
  lines = DEFAULT_SKELETON_ROWS,
  minHeight = STATE_MIN_HEIGHT,
}: LoadingStateProps) {
  return (
    <div
      data-testid="loading-state"
      role="status"
      aria-busy="true"
      className="flex flex-col justify-center gap-3"
      style={{ minHeight }}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} width={index === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}
