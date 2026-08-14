import { SKELETON_LINE_HEIGHT } from './metrics'

interface SkeletonProps {
  width?: string
  height?: string
}

export default function Skeleton({
  width = '100%',
  height = SKELETON_LINE_HEIGHT,
}: SkeletonProps) {
  return (
    <span
      data-testid="skeleton"
      aria-hidden="true"
      className="block animate-pulse rounded-sm bg-background-tertiary motion-reduce:animate-none"
      style={{ width, height }}
    />
  )
}
