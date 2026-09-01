import { SKELETON_LINE_HEIGHT } from './metrics'

interface SkeletonProps {
  width?: string
}

export default function Skeleton({ width = '100%' }: SkeletonProps) {
  return (
    <span
      data-testid="skeleton"
      aria-hidden="true"
      className="block animate-pulse rounded-sm bg-background-tertiary motion-reduce:animate-none"
      style={{ width, height: SKELETON_LINE_HEIGHT }}
    />
  )
}
