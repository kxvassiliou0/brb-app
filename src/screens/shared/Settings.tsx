import InputWithLabel from '@/components/InputWithLabel'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import { initialsFromEmail, initialsFromName } from '@/components/UserSummary'
import { ErrorState, LoadingState } from '@/components/states'
import { useAuth } from '@/lib/auth'
import { countLabel } from '@/lib/dates'
import { LEAVE_YEAR_RESET_LABEL } from '@/lib/leaveYear'
import { useApiResource } from '@/lib/useApiResource'
import type { ApiSuccess, RemainingLeave, UserProfile } from '@/types/api'

const UNKNOWN = '—'

const SECTION =
  'flex flex-col gap-5 rounded-2xl border border-border-primary bg-background-secondary p-4 sm:p-6'

export function profileName(profile: UserProfile): string {
  return `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
}

function text(value: string | undefined): string {
  return value?.trim() ? value : UNKNOWN
}

function days(value: number | undefined): string {
  return Number.isFinite(value) ? countLabel(value as number, 'day') : UNKNOWN
}

interface ProfileField {
  id: string
  label: string
  value: string
}

export function profileFields(
  profile: UserProfile,
  name: string
): ProfileField[] {
  return [
    { id: 'profile-name', label: 'Full name', value: text(name) },
    { id: 'profile-email', label: 'Email address', value: text(profile.email) },
    { id: 'profile-role', label: 'Role', value: text(profile.role) },
    {
      id: 'profile-department',
      label: 'Department',
      value: text(profile.department?.name),
    },
    {
      id: 'profile-job-role',
      label: 'Job role',
      value: text(profile.jobRole?.name),
    },
    {
      id: 'profile-allowance',
      label: 'Annual leave allowance',
      value: days(profile.annualLeaveAllowance),
    },
  ]
}

export default function Settings() {
  const { user } = useAuth()
  const profile = useApiResource<ApiSuccess<UserProfile>>('/api/users/me')
  const balance = useApiResource<ApiSuccess<RemainingLeave>>(
    user ? `/api/leave-requests/remaining/${user.id}` : null
  )

  const me = profile.data?.data ?? null
  const name = me ? profileName(me) : ''

  return (
    <div data-testid="screen-settings" className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your profile and leave settings"
      />

      <section
        aria-labelledby="profile-heading"
        data-testid="profile-section"
        className={SECTION}
      >
        <h2 id="profile-heading" className="text-xl md:text-2xl">
          Profile
        </h2>

        {profile.error ? (
          <ErrorState
            error={profile.error}
            onRetry={profile.retry}
            fallbackMessage="Could not load your profile"
          />
        ) : me === null ? (
          <LoadingState label="Loading your profile" />
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-4">
              <span
                aria-hidden="true"
                data-testid="profile-avatar"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sage-background text-lg font-semibold text-text-secondary"
              >
                {name
                  ? initialsFromName(name)
                  : me.email
                    ? initialsFromEmail(me.email)
                    : ''}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span
                  data-testid="profile-display-name"
                  className="truncate text-lg font-semibold"
                >
                  {text(name)}
                </span>
                <span className="truncate text-text-secondary">
                  {text(me.email)}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {profileFields(me, name).map((field) => (
                <InputWithLabel
                  key={field.id}
                  id={field.id}
                  label={field.label}
                  value={field.value}
                  readOnly
                />
              ))}
            </div>

            <p className="text-sm text-text-secondary">
              These details are held by your administrator. Ask them to make a
              change if anything here is wrong.
            </p>
          </>
        )}
      </section>

      <section
        aria-labelledby="leave-allowance-heading"
        data-testid="leave-allowance-section"
        className={SECTION}
      >
        <h2 id="leave-allowance-heading" className="text-xl md:text-2xl">
          Leave allowance
        </h2>

        {balance.error ? (
          <ErrorState
            error={balance.error}
            onRetry={balance.retry}
            fallbackMessage="Could not load your leave allowance"
          />
        ) : balance.data === null ? (
          <LoadingState label="Loading your leave allowance" />
        ) : (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              tone="recessed"
              label="Annual allowance"
              value={days(balance.data.data?.annual_allowance)}
              hint={LEAVE_YEAR_RESET_LABEL}
            />
            <StatCard
              tone="recessed"
              label="Taken so far"
              value={days(balance.data.data?.days_used)}
              hint="approved leave"
            />
            <StatCard
              tone="positive"
              label="Remaining"
              value={days(balance.data.data?.days_remaining)}
              hint="left to book"
            />
          </dl>
        )}
      </section>
    </div>
  )
}
