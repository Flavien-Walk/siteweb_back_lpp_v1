import api from './api'
import type { User, ApiResponse, PaginatedResponse } from '@/types'

export interface UserFilters {
  search?: string
  role?: string
  status?: 'active' | 'suspended' | 'banned'
  dateFrom?: string
  dateTo?: string
}

export interface UserListParams extends UserFilters {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface SanctionParams {
  reason: string
  duration?: number // in hours, for suspend
}

export interface UserStats {
  totalUsers: number
  newToday: number
  newThisWeek: number
  active: number
  suspended: number
  banned: number
  byRole: Record<string, number>
}

export const usersService = {
  /**
   * Get paginated list of users with filters
   */
  async getUsers(params: UserListParams = {}): Promise<PaginatedResponse<User>> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get<ApiResponse<PaginatedResponse<User>>>(
      `/admin/users?${searchParams.toString()}`
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des utilisateurs')
    }

    return response.data.data
  },

  /**
   * Get a single user by ID
   */
  async getUser(id: string): Promise<User> {
    const response = await api.get<ApiResponse<{ user: User }>>(`/admin/users/${id}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Utilisateur non trouvé')
    }

    return response.data.data.user
  },

  /**
   * Search users by name or email
   */
  async searchUsers(query: string): Promise<User[]> {
    const response = await api.get<ApiResponse<{ users: User[] }>>(
      `/admin/users/search?q=${encodeURIComponent(query)}`
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur de recherche')
    }

    return response.data.data.users
  },

  /**
   * Warn a user
   */
  async warnUser(id: string, reason: string): Promise<User> {
    const response = await api.post<ApiResponse<{ user: User }>>(
      `/admin/moderation/${id}/warn`,
      { reason }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de l\'avertissement')
    }

    return response.data.data.user
  },

  /**
   * Suspend a user
   */
  async suspendUser(id: string, params: SanctionParams): Promise<User> {
    const response = await api.post<ApiResponse<{ user: User }>>(
      `/admin/moderation/${id}/suspend`,
      params
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de la suspension')
    }

    return response.data.data.user
  },

  /**
   * Ban a user
   */
  async banUser(id: string, reason: string): Promise<User> {
    const response = await api.post<ApiResponse<{ user: User }>>(
      `/admin/moderation/${id}/ban`,
      { reason }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du bannissement')
    }

    return response.data.data.user
  },

  /**
   * Unban a user
   */
  async unbanUser(id: string): Promise<User> {
    const response = await api.post<ApiResponse<{ user: User }>>(
      `/admin/moderation/${id}/unban`
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du débannissement')
    }

    return response.data.data.user
  },

  /**
   * Update user role
   */
  async updateRole(id: string, role: string): Promise<User> {
    const response = await api.patch<ApiResponse<{ user: User }>>(
      `/admin/users/${id}/role`,
      { role }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de la modification du rôle')
    }

    return response.data.data.user
  },

  /**
   * Get user statistics
   */
  async getStats(): Promise<UserStats> {
    const response = await api.get<ApiResponse<UserStats>>('/admin/users/stats')

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des stats')
    }

    return response.data.data
  },

  /**
   * Get user's moderation history (warnings, suspensions, bans)
   */
  async getModerationHistory(id: string): Promise<{
    warnings: Array<{ reason: string; date: string; moderator: string }>
    suspensions: Array<{ reason: string; startDate: string; endDate: string; moderator: string }>
    bans: Array<{ reason: string; date: string; moderator: string }>
  }> {
    const response = await api.get<ApiResponse<{
      warnings: Array<{ reason: string; date: string; moderator: string }>
      suspensions: Array<{ reason: string; startDate: string; endDate: string; moderator: string }>
      bans: Array<{ reason: string; date: string; moderator: string }>
    }>>(`/admin/users/${id}/moderation-history`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement de l\'historique')
    }

    return response.data.data
  },
}

export default usersService
