import { useAuth } from '../../lib/auth'
import PageHeader from '../../components/PageHeader'

export default function Settings() {
  const { user } = useAuth()
  return (
    <div data-testid="screen-settings">
      <PageHeader title="Settings" description="Account details." />
      <div className="flex max-w-2xl flex-col gap-4 rounded-xl border border-border-primary bg-background-secondary p-4 sm:p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-sm text-text-secondary">Email</dt>
            <dd className="mt-1 break-words">{user?.email}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-sm text-text-secondary">Role</dt>
            <dd className="mt-1">{user?.role}</dd>
          </div>
        </dl>
        <p className="text-text-secondary">
          Profile editing is not available yet.
        </p>
      </div>
    </div>
  )
}
