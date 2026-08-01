import { Outlet, useNavigate } from 'react-router'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/lib/auth'

export default function AppLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  function handleSignOut() {
    logout()
    navigate('/login')
  }

  return (
    <div data-testid="app-layout">
      <Sidebar />
      <div>
        <header>
          <h1>brb-app</h1>
          <span>{user ? `${user.email} (${user.role})` : null}</span>
          <button onClick={handleSignOut}>Sign out</button>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
