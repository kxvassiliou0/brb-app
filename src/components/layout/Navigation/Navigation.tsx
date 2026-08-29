import { NavLink, useLocation, useNavigate } from 'react-router'
import BrandHeader from '@/components/layout/BrandHeader'
import Icon, { type IconName } from '@/components/ui/Icon'
import UserSummary from '@/components/layout/UserSummary'
import { NAV_BREAKPOINT } from '@/lib/breakpoints'
import { useBreakpoint } from '@/lib/useMediaQuery'
import { useAuth } from '@/lib/auth'
import {
  HOME_PATH,
  REQUESTS_PATH,
  SETTINGS_PATH,
  type Role,
} from '@/lib/routeAccess'

type NavItem = {
  to: string
  label: string
  shortLabel: string
  icon: IconName
  end?: boolean
}

const extrasByRole: Record<Role, NavItem[]> = {
  Admin: [
    {
      to: '/employees',
      label: 'Employees',
      shortLabel: 'People',
      icon: 'people',
    },
    {
      to: '/departments',
      label: 'Departments',
      shortLabel: 'Teams',
      icon: 'departments',
    },
    {
      to: '/team-calendar',
      label: 'Team calendar',
      shortLabel: 'Calendar',
      icon: 'calendar',
    },
  ],
  Manager: [
    {
      to: '/team-calendar',
      label: 'Team calendar',
      shortLabel: 'Calendar',
      icon: 'calendar',
    },
  ],
  Employee: [],
}

function navFor(role: Role): NavItem[] {
  return [
    {
      to: HOME_PATH,
      label: 'Dashboard',
      shortLabel: 'Home',
      icon: 'dashboard',
      end: true,
    },
    {
      to: REQUESTS_PATH,
      label: 'Requests',
      shortLabel: 'Requests',
      icon: 'clock',
    },
    ...extrasByRole[role],
    {
      to: SETTINGS_PATH,
      label: 'Settings',
      shortLabel: 'Settings',
      icon: 'settings',
    },
  ]
}

const SIDEBAR_LINK =
  'touch-target flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-text-primary hover:bg-background-tertiary aria-[current=page]:bg-sage-background aria-[current=page]:text-sage-foreground'

const BOTTOM_LINK =
  'touch-target flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold text-text-primary hover:bg-background-tertiary aria-[current=page]:bg-sage-background aria-[current=page]:text-sage-foreground'

export default function Navigation({
  collapsed = false,
}: {
  collapsed?: boolean
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useBreakpoint(NAV_BREAKPOINT)
  const links = user ? navFor(user.role) : []

  function handleSignOut() {
    logout()
    navigate('/login')
  }

  if (!isDesktop) {
    return (
      <nav
        data-testid="bottom-nav"
        aria-label="Main"
        className="sticky bottom-0 z-10 order-last border-t border-border-primary bg-background-secondary"
      >
        <ul key={location.pathname} className="flex items-stretch gap-1 p-2">
          {links.map((l) => (
            <li key={l.to} className="flex min-w-0 flex-1">
              <NavLink to={l.to} end={l.end} className={BOTTOM_LINK}>
                <Icon name={l.icon} />
                <span className="w-full truncate text-center">
                  {l.shortLabel}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    )
  }

  return (
    <div
      inert={collapsed}
      className={`sticky top-5 m-5 flex h-[calc(100svh-2.5rem)] w-sidebar shrink-0 flex-col gap-8 rounded-[2rem] border border-border-primary bg-background-secondary p-8 shadow-[0_14px_34px_rgba(23,22,15,0.04)] transition-[margin-left,opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
        collapsed
          ? 'pointer-events-none -ml-[calc(var(--container-sidebar)+1.25rem)] -translate-x-4 opacity-0'
          : 'opacity-100'
      }`}
    >
      <BrandHeader />
      <nav data-testid="sidebar" aria-label="Main">
        <ul key={location.pathname} className="flex flex-col gap-1">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} end={l.end} className={SIDEBAR_LINK}>
                <Icon name={l.icon} />
                <span className="truncate">{l.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-1 flex-col justify-end gap-3">
        <span className="h-px w-full bg-border-primary" />
        <UserSummary user={user} onSignOut={handleSignOut} />
      </div>
    </div>
  )
}
