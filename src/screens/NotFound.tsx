import LinkButton from '@/components/LinkButton'
import { useAuth } from '@/lib/auth'
import { HOME_PATH } from '@/lib/routeAccess'

export default function NotFound() {
  const { user } = useAuth()
  const home = user ? HOME_PATH : '/login'

  return (
    <div
      data-testid="not-found"
      className="flex min-h-[70svh] flex-col items-center justify-center gap-4 px-4 py-10 text-center sm:px-6"
    >
      <h1 className="text-2xl md:text-3xl">404 - Page not found</h1>
      <p className="text-text-secondary">
        The page you're looking for doesn't exist or has moved.
      </p>
      <LinkButton to={home}>
        {user ? 'Back to dashboard' : 'Back to sign in'}
      </LinkButton>
    </div>
  )
}
