import { useAuth } from '@/lib/auth'
import AdminDashboard from '@/screens/admin/AdminDashboard'
import EmployeeDashboard from '@/screens/employee/EmployeeDashboard'
import ManagerDashboard from '@/screens/manager/ManagerDashboard'

export default function Dashboard() {
  const { user } = useAuth()

  if (user?.role === 'Admin') return <AdminDashboard />
  if (user?.role === 'Manager') return <ManagerDashboard />
  return <EmployeeDashboard />
}
