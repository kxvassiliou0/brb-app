import { useAuth } from '../../lib/auth'
import PageHeader from '../../components/PageHeader'

export default function Settings() {
  const { user } = useAuth()
  return (
    <div data-testid="screen-settings">
      <PageHeader title="Settings" description="Account details." />
      <p>Email: {user?.email}</p>
      <p>Role: {user?.role}</p>
      <p>Profile editing is not available yet.</p>
    </div>
  )
}
