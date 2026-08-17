import type { AuthUser } from '@/lib/auth'
import Icon from '@/components/Icon'

export function initialsFromName(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return (
    parts
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  )
}

export function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  const letters = local
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
  return (letters.join('') || email.slice(0, 2)).toUpperCase()
}

interface UserSummaryProps {
  user: AuthUser | null
  onSignOut: () => void
}

export default function UserSummary({ user, onSignOut }: UserSummaryProps) {
  return (
    <div className="flex items-center gap-4">
      <span
        aria-hidden="true"
        className="flex h-[2.375rem] w-[2.375rem] shrink-0 items-center justify-center rounded-full bg-sage-background text-base font-semibold text-text-secondary"
      >
        {user ? initialsFromEmail(user.email) : ''}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-text-primary">
          {user?.email}
        </span>
        <span className="truncate text-sm font-medium text-text-secondary">
          {user?.role}
        </span>
      </span>
      <button
        type="button"
        onClick={onSignOut}
        className="touch-target inline-flex shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-background-tertiary"
      >
        <Icon name="signOut" />
        <span className="sr-only">Sign out</span>
      </button>
    </div>
  )
}
