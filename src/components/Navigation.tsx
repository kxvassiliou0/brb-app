import { NavLink, useLocation, useNavigate } from 'react-router'
import BrandHeader from '@/components/BrandHeader'
import NavIcon, { type NavIconName } from '@/components/NavIcon'
import UserSummary from '@/components/UserSummary'
import { NAV_BREAKPOINT } from '@/lib/breakpoints'
import { useBreakpoint } from '@/lib/useMediaQuery'
import { useAuth } from '@/lib/auth'

type NavItem = {
  to: string
  label: string
  shortLabel: string
  icon: NavIconName
  end?: boolean
}

const navByRole: Record<'admin' | 'employee' | 'manager', NavItem[]> = {
  admin: [
    {
      to: '/admin',
      label: 'Dashboard',
      shortLabel: 'Home',
      icon: 'dashboard',
      end: true,
    },
    {
      to: '/admin/requests',
      label: 'Requests',
      shortLabel: 'Requests',
      icon: 'requests',
    },
    {
      to: '/admin/employees',
      label: 'Employees',
      shortLabel: 'People',
      icon: 'people',
    },
    {
      to: '/admin/departments',
      label: 'Departments',
      shortLabel: 'Teams',
      icon: 'departments',
    },
    {
      to: '/admin/settings',
      label: 'Settings',
      shortLabel: 'Settings',
      icon: 'settings',
    },
  ],
  employee: [
    {
      to: '/employee',
      label: 'Dashboard',
      shortLabel: 'Home',
      icon: 'dashboard',
      end: true,
    },
    {
      to: '/employee/my-requests',
      label: 'My requests',
      shortLabel: 'Requests',
      icon: 'requests',
    },
    {
      to: '/employee/settings',
      label: 'Settings',
      shortLabel: 'Settings',
      icon: 'settings',
    },
  ],
  manager: [
    {
      to: '/manager',
      label: 'Dashboard',
      shortLabel: 'Home',
      icon: 'dashboard',
      end: true,
    },
    {
      to: '/manager/requests',
      label: 'Requests',
      shortLabel: 'Requests',
      icon: 'requests',
    },
    {
      to: '/manager/team-calendar',
      label: 'Team calendar',
      shortLabel: 'Calendar',
      icon: 'calendar',
    },
    {
      to: '/manager/settings',
      label: 'Settings',
      shortLabel: 'Settings',
      icon: 'settings',
    },
  ],
}

const SIDEBAR_LINK =
  'touch-target flex items-center gap-3 rounded-xl p-3 text-sm font-semibold text-text-primary hover:bg-background-tertiary aria-[current=page]:bg-sage-background aria-[current=page]:text-sage-foreground'

const BOTTOM_LINK =
  'touch-target flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold text-text-primary hover:bg-background-tertiary aria-[current=page]:bg-sage-background aria-[current=page]:text-sage-foreground'

export default function Navigation() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useBreakpoint(NAV_BREAKPOINT)
  const role = user
    ? (user.role.toLowerCase() as 'admin' | 'employee' | 'manager')
    : null
  const links = role ? navByRole[role] : []

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
                <NavIcon name={l.icon} />
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
    <div className="sticky top-5 m-5 flex h-[calc(100svh-2.5rem)] w-sidebar shrink-0 flex-col gap-8 rounded-[2rem] border border-border-primary bg-background-secondary p-8 shadow-[0_14px_34px_rgba(23,22,15,0.04)]">
      <BrandHeader />
      <nav data-testid="sidebar" aria-label="Main">
        <ul key={location.pathname} className="flex flex-col gap-1">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} end={l.end} className={SIDEBAR_LINK}>
                <NavIcon name={l.icon} />
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
