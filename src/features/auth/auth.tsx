import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { clearApiCache } from '@/api/cache'
import { login as requestToken } from '@/api/session'
import { getStoredToken, setStoredToken } from '@/api/token'

const MS_PER_SECOND = 1000

export interface AuthUser {
  id: number
  email: string
  role: 'Admin' | 'Manager' | 'Employee'
}

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function decodeUser(token: string): AuthUser | null {
  const payload = decodeTokenPayload(token)
  return (payload?.token as AuthUser | undefined) ?? null
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeTokenPayload(token)
  const exp = payload?.exp
  return typeof exp !== 'number' || Date.now() >= exp * MS_PER_SECOND
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = getStoredToken()
    return stored ? decodeUser(stored) : null
  })

  useEffect(() => {
    setStoredToken(token)
  }, [token])

  useEffect(() => {
    if (!token) return
    const payload = decodeTokenPayload(token)
    const exp = payload?.exp
    if (typeof exp !== 'number') return
    const msRemaining = exp * MS_PER_SECOND - Date.now()
    if (msRemaining <= 0) {
      logout()
      return
    }
    const timer = setTimeout(logout, msRemaining)
    return () => clearTimeout(timer)
  }, [token])

  async function login(email: string, password: string): Promise<AuthUser> {
    const jwt = await requestToken(email, password)
    clearApiCache()
    const decoded = decodeUser(jwt)
    if (!decoded) throw new Error('Received an invalid token from the server')
    setToken(jwt)
    setUser(decoded)
    return decoded
  }

  function logout(): void {
    clearApiCache()
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
