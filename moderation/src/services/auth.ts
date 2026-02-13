import api, { setAuthToken } from './api'
import type { User, ApiResponse, Permission } from '@/types'

interface LoginResponse {
  utilisateur: {
    _id: string
    prenom: string
    nom: string
    email: string
    avatar?: string
    role: string
  }
  token: string
}

interface MeResponse {
  user: User
}

export const authService = {
  /**
   * Login with email and password
   */
  async login(email: string, motDePasse: string): Promise<User> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/connexion', {
      email,
      motDePasse,
    })

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur de connexion')
    }

    const { token } = response.data.data
    setAuthToken(token)

    // Fetch full user data with permissions
    return this.getMe()
  },

  /**
   * Get current authenticated user
   */
  async getMe(): Promise<User> {
    const response = await api.get<ApiResponse<MeResponse>>('/admin/me')

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur de récupération utilisateur')
    }

    return response.data.data.user
  },

  /**
   * Logout - blackliste le JWT cote serveur puis supprime le token local
   */
  async logout() {
    try {
      await api.post('/auth/deconnexion', {})
    } catch {
      // Ignorer les erreurs reseau - suppression locale dans tous les cas
    }
    setAuthToken(null)
  },

  /**
   * Check if user has a specific permission
   */
  hasPermission(user: User | null, permission: Permission): boolean {
    if (!user) return false
    return user.permissions.includes(permission)
  },

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
    if (!user) return false
    return permissions.some((p) => user.permissions.includes(p))
  },

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
    if (!user) return false
    return permissions.every((p) => user.permissions.includes(p))
  },

  /**
   * Check if user is staff (modo_test or higher)
   */
  isStaff(user: User | null): boolean {
    if (!user) return false
    const staffRoles = ['modo_test', 'modo', 'admin_modo', 'super_admin']
    return staffRoles.includes(user.role)
  },

  /**
   * Check if user is admin (admin_modo or super_admin)
   */
  isAdmin(user: User | null): boolean {
    if (!user) return false
    return user.role === 'admin_modo' || user.role === 'super_admin'
  },

  /**
   * Get role level for comparison
   */
  getRoleLevel(role: string): number {
    const levels: Record<string, number> = {
      user: 0,
      modo_test: 1,
      modo: 2,
      admin_modo: 3,
      super_admin: 4,
    }
    return levels[role] || 0
  },
}

export default authService
