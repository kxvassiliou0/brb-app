import Skeleton from './Skeleton'
import { DEFAULT_SKELETON_ROWS, STATE_MIN_HEIGHT } from './metrics'

interface LoadingStateProps {
  label?: string
}

export default function LoadingState({ label = 'Loading' }: LoadingStateProps) {
  return (
    <div
      data-testid="loading-state"
      role="status"
      aria-busy="true"
      className="flex flex-col justify-center gap-3"
      style={{ minHeight: STATE_MIN_HEIGHT }}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: DEFAULT_SKELETON_ROWS }, (_, index) => (
        <Skeleton
          key={index}
          width={index === DEFAULT_SKELETON_ROWS - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  )
}
