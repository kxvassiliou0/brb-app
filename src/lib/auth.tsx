import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { getStoredToken, loginRequest, setStoredToken } from './api'

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

function decodeUser(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json).token ?? null
  } catch {
    return null
  }
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

  async function login(email: string, password: string): Promise<AuthUser> {
    const jwt = await loginRequest(email, password)
    const decoded = decodeUser(jwt)
    if (!decoded) throw new Error('Received an invalid token from the server')
    setToken(jwt)
    setUser(decoded)
    return decoded
  }

  function logout(): void {
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
