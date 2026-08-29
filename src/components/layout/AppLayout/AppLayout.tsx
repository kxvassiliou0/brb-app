import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import BrandHeader from '@/components/layout/BrandHeader'
import Breadcrumb from '@/components/layout/Breadcrumb'
import Navigation from '@/components/layout/Navigation'
import UserSummary from '@/components/layout/UserSummary'
import { NAV_BREAKPOINT } from '@/lib/breakpoints'
import { useBreakpoint } from '@/lib/useMediaQuery'
import { useAuth } from '@/lib/auth'

export default function AppLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isDesktop = useBreakpoint(NAV_BREAKPOINT)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  function handleSignOut() {
    logout()
    navigate('/login')
  }

  return (
    <div
      data-testid="app-layout"
      className="flex min-h-svh flex-col md:flex-row"
    >
      <Navigation collapsed={sidebarCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        {!isDesktop && (
          <header className="flex flex-col gap-3 border-b border-border-primary bg-background-secondary px-4 py-4">
            <BrandHeader />
            <UserSummary user={user} onSignOut={handleSignOut} />
          </header>
        )}
        <main
          className={`min-w-0 flex-1 px-4 py-6 transition-[padding] duration-300 ease-out motion-reduce:transition-none md:py-8 md:pr-8 ${
            sidebarCollapsed ? 'md:pl-8' : 'md:pl-0'
          }`}
        >
          <Breadcrumb
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
          />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
