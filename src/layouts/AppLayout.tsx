import { Outlet, useNavigate } from 'react-router'
import BrandHeader from '@/components/BrandHeader'
import Navigation from '@/components/Navigation'
import UserSummary from '@/components/UserSummary'
import { NAV_BREAKPOINT } from '@/lib/breakpoints'
import { useBreakpoint } from '@/lib/useMediaQuery'
import { useAuth } from '@/lib/auth'

export default function AppLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isDesktop = useBreakpoint(NAV_BREAKPOINT)

  function handleSignOut() {
    logout()
    navigate('/login')
  }

  return (
    <div
      data-testid="app-layout"
      className="flex min-h-svh flex-col md:flex-row"
    >
      <Navigation />
      <div className="flex min-w-0 flex-1 flex-col">
        {!isDesktop && (
          <header className="flex flex-col gap-3 border-b border-border-primary bg-background-secondary px-4 py-4">
            <BrandHeader />
            <UserSummary user={user} onSignOut={handleSignOut} />
          </header>
        )}
        <main className="min-w-0 flex-1 px-4 py-6 md:py-8 md:pr-8 md:pl-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
