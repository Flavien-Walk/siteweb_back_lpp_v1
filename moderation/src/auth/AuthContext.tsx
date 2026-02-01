import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authService } from '@/services/auth'
import type { User, Permission } from '@/types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  isStaff: boolean
  isAdmin: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setUser(null)
        return
      }

      const userData = await authService.getMe()

      // Verify user is staff
      if (!authService.isStaff(userData)) {
        authService.logout()
        setUser(null)
        navigate('/login?error=not_staff')
        return
      }

      setUser(userData)
    } catch {
      setUser(null)
      authService.logout()
    }
  }, [navigate])

  // Initial auth check
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      await refreshUser()
      setIsLoading(false)
    }
    initAuth()
  }, [refreshUser])

  const login = useCallback(
    async (email: string, password: string) => {
      const userData = await authService.login(email, password)

      // Verify user is staff
      if (!authService.isStaff(userData)) {
        authService.logout()
        throw new Error('Accès réservé au personnel de modération')
      }

      setUser(userData)

      // Redirect to intended page or dashboard
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
      navigate(from, { replace: true })
    },
    [navigate, location.state]
  )

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
    navigate('/login')
  }, [navigate])

  const hasPermission = useCallback(
    (permission: Permission) => authService.hasPermission(user, permission),
    [user]
  )

  const hasAnyPermission = useCallback(
    (permissions: Permission[]) => authService.hasAnyPermission(user, permissions),
    [user]
  )

  const hasAllPermissions = useCallback(
    (permissions: Permission[]) => authService.hasAllPermissions(user, permissions),
    [user]
  )

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isStaff: authService.isStaff(user),
    isAdmin: authService.isAdmin(user),
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
