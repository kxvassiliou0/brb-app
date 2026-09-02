import { useState } from 'react'
import { Outlet } from 'react-router'
import Breadcrumb from '@/components/layout/Breadcrumb'
import Navigation from '@/components/layout/Navigation'
import { NAV_BREAKPOINT } from '@/lib/breakpoints'
import { useBreakpoint } from '@/lib/useMediaQuery'

export default function AppLayout() {
  const isDesktop = useBreakpoint(NAV_BREAKPOINT)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div
      data-testid="app-layout"
      className="flex min-h-svh flex-col md:flex-row"
    >
      {isDesktop && <Navigation collapsed={sidebarCollapsed} />}
      <div className="flex min-w-0 flex-1 flex-col">
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
      {!isDesktop && <Navigation collapsed={sidebarCollapsed} />}
    </div>
  )
}
