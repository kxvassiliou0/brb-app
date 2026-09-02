import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '@/features/auth/auth'
import {
  canReviewRequests,
  HOME_PATH,
  REQUESTS_PATH,
  SETTINGS_PATH,
} from '@/lib/routeAccess'

const TRAIL_LIMIT = 4

function pageName(pathname: string, canReview: boolean): string {
  if (pathname === HOME_PATH) return 'Overview'
  if (pathname.startsWith(REQUESTS_PATH)) {
    return canReview ? 'Requests' : 'My requests'
  }
  if (pathname.startsWith('/team-calendar')) return 'Team calendar'
  if (pathname.startsWith('/employees')) return 'Employees'
  if (pathname.startsWith('/departments')) return 'Departments'
  if (pathname.startsWith(SETTINGS_PATH)) return 'Settings'
  return 'Not found'
}

function rootedAt(pathname: string): string[] {
  return pathname === HOME_PATH ? [HOME_PATH] : [HOME_PATH, pathname]
}

function useTrail(pathname: string): string[] {
  const [trail, setTrail] = useState<string[]>(() => rootedAt(pathname))

  if (trail[trail.length - 1] !== pathname) {
    const visited = trail.indexOf(pathname)
    const next =
      visited === -1 ? [...trail, pathname] : trail.slice(0, visited + 1)
    setTrail(next.slice(-TRAIL_LIMIT))
  }

  return trail[trail.length - 1] === pathname ? trail : rootedAt(pathname)
}

interface BreadcrumbProps {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

export default function Breadcrumb({
  sidebarCollapsed,
  onToggleSidebar,
}: BreadcrumbProps) {
  const location = useLocation()
  const { user } = useAuth()
  const canReview = canReviewRequests(user?.role)
  const trail = useTrail(location.pathname)

  return (
    <div className="mb-6 flex items-center gap-3 border-b border-border-primary pb-4">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-pressed={sidebarCollapsed}
        aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        data-testid="sidebar-toggle"
        className="touch-target inline-flex items-center justify-center rounded-lg text-text-primary hover:bg-background-tertiary"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5">
          <rect
            x="2.5"
            y="3.5"
            width="15"
            height="13"
            rx="2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            x1="8"
            y1="3.5"
            x2="8"
            y2="16.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>

      <nav aria-label="Breadcrumb" data-testid="breadcrumb" className="min-w-0">
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {trail.map((path, index) => {
            const last = index === trail.length - 1
            return (
              <li key={path} className="flex items-center gap-2">
                {index > 0 && (
                  <span aria-hidden="true" className="text-text-secondary">
                    /
                  </span>
                )}
                {last ? (
                  <span
                    aria-current="page"
                    data-testid="breadcrumb-current"
                    className="font-medium text-text-primary"
                  >
                    {pageName(path, canReview)}
                  </span>
                ) : (
                  <Link
                    to={path}
                    data-testid="breadcrumb-ancestor"
                    className="touch-target inline-flex items-center rounded text-text-secondary underline-offset-4 hover:underline"
                  >
                    {pageName(path, canReview)}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
