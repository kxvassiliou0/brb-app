import { Navigate, Outlet, useLocation } from 'react-router'
import { isTokenExpired, useAuth } from '@/features/auth/auth'
import { HOME_PATH, type Role } from '@/lib/routeAccess'

interface ProtectedRouteProps {
  allowedRoles?: Role[]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { token, user, logout } = useAuth()
  const location = useLocation()

  if (!token || !user || isTokenExpired(token)) {
    if (token) logout()
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={HOME_PATH} replace />
  }

  return <Outlet />
}
