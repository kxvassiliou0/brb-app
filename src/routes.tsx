import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'
import { SUBTREE_ROLES } from '@/lib/routeAccess'
import Login from '@/screens/Login'
import NotFound from '@/screens/NotFound'
import AdminDashboard from '@/screens/admin/AdminDashboard'
import Departments from '@/screens/admin/Departments'
import Employees from '@/screens/admin/Employees'
import EmployeeDashboard from '@/screens/employee/EmployeeDashboard'
import MyRequests from '@/screens/employee/MyRequests'
import ManagerDashboard from '@/screens/manager/ManagerDashboard'
import TeamCalendar from '@/screens/manager/TeamCalendar'
import CreateRequest from '@/screens/shared/CreateRequest'
import RequestReview from '@/screens/shared/RequestReview'
import RequestsList from '@/screens/shared/RequestsList'
import Settings from '@/screens/shared/Settings'

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <Login /> },
  {
    element: <ProtectedRoute />,
    errorElement: <NotFound />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: 'admin',
            element: <ProtectedRoute allowedRoles={SUBTREE_ROLES.admin} />,
            children: [
              { index: true, element: <AdminDashboard /> },
              { path: 'employees', element: <Employees /> },
              { path: 'departments', element: <Departments /> },
              { path: 'requests', element: <RequestsList basePath="/admin" /> },
              { path: 'requests/new', element: <CreateRequest /> },
              { path: 'requests/:requestId', element: <RequestReview /> },
              { path: 'settings', element: <Settings /> },
            ],
          },
          {
            path: 'employee',
            element: <ProtectedRoute allowedRoles={SUBTREE_ROLES.employee} />,
            children: [
              { index: true, element: <EmployeeDashboard /> },
              { path: 'book-time-off', element: <CreateRequest /> },
              { path: 'my-requests', element: <MyRequests /> },
              { path: 'my-requests/new', element: <CreateRequest /> },
              { path: 'settings', element: <Settings /> },
            ],
          },
          {
            path: 'manager',
            element: <ProtectedRoute allowedRoles={SUBTREE_ROLES.manager} />,
            children: [
              { index: true, element: <ManagerDashboard /> },
              {
                path: 'requests',
                element: <RequestsList basePath="/manager" />,
              },
              { path: 'requests/new', element: <CreateRequest /> },
              { path: 'requests/:requestId', element: <RequestReview /> },
              { path: 'team-calendar', element: <TeamCalendar /> },
              { path: 'settings', element: <Settings /> },
            ],
          },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
