import { NavLink, useLocation } from 'react-router'

type NavItem = { to: string; label: string; end?: boolean }

const navByRole: Record<'admin' | 'employee' | 'manager', NavItem[]> = {
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/employees', label: 'Employees' },
    { to: '/admin/departments', label: 'Departments' },
    { to: '/admin/requests', label: 'Requests' },
    { to: '/admin/settings', label: 'Settings' },
  ],
  employee: [
    { to: '/employee', label: 'Dashboard', end: true },
    { to: '/employee/book-time-off', label: 'Book time off' },
    { to: '/employee/my-requests', label: 'My requests' },
    { to: '/employee/settings', label: 'Settings' },
  ],
  manager: [
    { to: '/manager', label: 'Dashboard', end: true },
    { to: '/manager/requests', label: 'Requests' },
    { to: '/manager/team-calendar', label: 'Team calendar' },
    { to: '/manager/settings', label: 'Settings' },
  ],
}

export function roleFromPathname(pathname: string): 'admin' | 'employee' | 'manager' | null {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/employee')) return 'employee'
  if (pathname.startsWith('/manager')) return 'manager'
  return null
}

export default function Sidebar() {
  const location = useLocation()
  const role = roleFromPathname(location.pathname)
  const links = role ? navByRole[role] : []

  return (
    <nav data-testid="sidebar">
      <ul key={location.pathname}>
        {links.map((l) => (
          <li key={l.to}>
            <NavLink to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
