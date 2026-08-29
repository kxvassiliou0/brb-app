import { createBrowserRouter, type RouteObject } from 'react-router'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { ADMIN_ROLES, TEAM_ROLES } from '@/lib/routeAccess'
import Dashboard from '@/screens/Dashboard'
import Login from '@/screens/Login'
import NotFound from '@/screens/NotFound'
import Departments from '@/screens/admin/Departments'
import Employees from '@/screens/admin/Employees'
import TeamCalendar from '@/screens/manager/TeamCalendar'
import Requests from '@/screens/shared/Requests'
import Settings from '@/screens/shared/Settings'

export const routes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  {
    element: <ProtectedRoute />,
    errorElement: <NotFound />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'requests', element: <Requests /> },
          { path: 'settings', element: <Settings /> },
          {
            element: <ProtectedRoute allowedRoles={TEAM_ROLES} />,
            children: [{ path: 'team-calendar', element: <TeamCalendar /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={ADMIN_ROLES} />,
            children: [
              { path: 'employees', element: <Employees /> },
              { path: 'departments', element: <Departments /> },
            ],
          },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
