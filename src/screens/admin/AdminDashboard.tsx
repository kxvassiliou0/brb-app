import { listAllRequests } from '@/api/leaveRequests'
import { listDepartments } from '@/api/orgUnits'
import { listUsers } from '@/api/users'
import { useResource } from '@/api/useResource'
import PageHeader from '@/components/layout/PageHeader'
import StatCard from '@/components/ui/StatCard'
import { ErrorState, LoadingState } from '@/components/ui/states'

interface Counts {
  users: number
  departments: number
  leaveRequests: number
}

async function loadCounts(): Promise<Counts> {
  const [users, departments, leaveRequests] = await Promise.all([
    listUsers(),
    listDepartments(),
    listAllRequests(),
  ])
  return {
    users: users.length,
    departments: departments.length,
    leaveRequests: leaveRequests.length,
  }
}

export default function AdminDashboard() {
  const { data: counts, error, retry } = useResource(loadCounts)

  return (
    <div data-testid="screen-admin-dashboard">
      <PageHeader
        title="Admin dashboard"
        description="Overview of organisation-wide activity."
      />
      {error ? (
        <ErrorState
          error={error}
          onRetry={retry}
          fallbackMessage="Failed to load dashboard data"
        />
      ) : counts === null ? (
        <LoadingState label="Loading dashboard data" />
      ) : (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Employees" value={counts.users} />
          <StatCard label="Departments" value={counts.departments} />
          <StatCard label="Leave requests" value={counts.leaveRequests} />
        </dl>
      )}
    </div>
  )
}
