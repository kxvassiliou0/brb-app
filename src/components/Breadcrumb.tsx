import { Link, useLocation, useParams } from 'react-router'
import { useAuth } from '@/lib/auth'
import {
  canReviewRequests,
  REQUESTS_PATH,
  SETTINGS_PATH,
} from '@/lib/routeAccess'

interface Crumb {
  section: string
  sectionPath: string
  page: string
}

const SECTION_TIME_OFF = { section: 'Time off', sectionPath: REQUESTS_PATH }

const SECTION_PEOPLE = { section: 'People', sectionPath: '/employees' }

export function crumbFor(
  pathname: string,
  requestId: string | undefined,
  canReview: boolean
): Crumb {
  if (pathname === '/') {
    return { section: 'Dashboard', sectionPath: '/', page: 'Overview' }
  }
  if (requestId) {
    return { ...SECTION_TIME_OFF, page: `Request #${requestId}` }
  }
  if (pathname.startsWith(REQUESTS_PATH)) {
    return {
      ...SECTION_TIME_OFF,
      page: canReview ? 'Requests' : 'My requests',
    }
  }
  if (pathname.startsWith('/team-calendar')) {
    return { ...SECTION_TIME_OFF, page: 'Team calendar' }
  }
  if (pathname.startsWith('/employees')) {
    return { ...SECTION_PEOPLE, page: 'Employees' }
  }
  if (pathname.startsWith('/departments')) {
    return { ...SECTION_PEOPLE, page: 'Departments' }
  }
  if (pathname.startsWith(SETTINGS_PATH)) {
    return { section: 'Account', sectionPath: SETTINGS_PATH, page: 'Settings' }
  }
  return { section: 'Dashboard', sectionPath: '/', page: 'Not found' }
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
  const { requestId } = useParams()
  const { user } = useAuth()
  const crumb = crumbFor(
    location.pathname,
    requestId,
    canReviewRequests(user?.role)
  )

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
          <li>
            <Link
              to={crumb.sectionPath}
              className="touch-target inline-flex items-center rounded text-text-secondary underline-offset-4 hover:underline"
            >
              {crumb.section}
            </Link>
          </li>
          <li aria-hidden="true" className="text-text-secondary">
            /
          </li>
          <li aria-current="page" className="font-medium text-text-primary">
            {crumb.page}
          </li>
        </ol>
      </nav>
    </div>
  )
}
