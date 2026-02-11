import api from './api'
import type { User, ApiResponse, PaginatedResponse, AuditLog, UserTimeline, UserReport } from '@/types'

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
  durationHours?: number // Backend expects 'durationHours' (1-8760)
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

    const response = await api.get<ApiResponse<{
      users: User[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(
      `/admin/users?${searchParams.toString()}`
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des utilisateurs')
    }

    // Transform backend response to match PaginatedResponse interface
    const { users, pagination } = response.data.data
    return {
      items: users,
      currentPage: pagination.page,
      totalPages: pagination.pages,
      totalCount: pagination.total,
      hasNextPage: pagination.page < pagination.pages,
      hasPrevPage: pagination.page > 1,
    }
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
   * Backend: POST /api/admin/users/:id/warn
   * Body: { reason: string }
   */
  async warnUser(id: string, reason: string): Promise<User> {
    const response = await api.post<ApiResponse<{ user: User }>>(
      `/admin/users/${id}/warn`,
      { reason }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de l\'avertissement')
    }

    return response.data.data.user
  },

  /**
   * Suspend a user
   * Backend: POST /api/admin/users/:id/suspend
   * Body: { reason: string, duration?: number (hours) }
   */
  async suspendUser(id: string, params: SanctionParams): Promise<User> {
    const response = await api.post<ApiResponse<{ user: User }>>(
      `/admin/users/${id}/suspend`,
      params
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de la suspension')
    }

    return response.data.data.user
  },

  /**
   * Ban a user
   * Backend: POST /api/admin/users/:id/ban
   * Body: { reason: string }
   */
  async banUser(id: string, reason: string): Promise<User> {
    const response = await api.post<ApiResponse<{ user: User }>>(
      `/admin/users/${id}/ban`,
      { reason }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du bannissement')
    }

    return response.data.data.user
  },

  /**
   * Unban a user
   * Backend: POST /api/admin/users/:id/unban
   */
  async unbanUser(id: string): Promise<User> {
    const response = await api.post<ApiResponse<{ user: User }>>(
      `/admin/users/${id}/unban`
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du débannissement')
    }

    return response.data.data.user
  },

  /**
   * Unsuspend a user (lift suspension)
   * Backend: POST /api/moderation/users/:id/unsuspend
   */
  async unsuspendUser(id: string): Promise<User> {
    const response = await api.post<ApiResponse<{ user: User }>>(
      `/moderation/users/${id}/unsuspend`
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de la levée de suspension')
    }

    return response.data.data.user
  },

  /**
   * Update user role
   */
  async updateRole(id: string, role: string): Promise<void> {
    const response = await api.patch<ApiResponse<{ oldRole: string; newRole: string }>>(
      `/admin/users/${id}/role`,
      { newRole: role }
    )

    if (!response.data.succes) {
      throw new Error(response.data.message || 'Erreur lors de la modification du rôle')
    }
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

  /**
   * Get user's audit log history (all moderation actions involving this user)
   */
  async getUserAuditHistory(id: string, params: { page?: number; limit?: number } = {}): Promise<{
    auditLogs: AuditLog[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.append('page', String(params.page))
    if (params.limit) searchParams.append('limit', String(params.limit))

    const response = await api.get<ApiResponse<{
      auditLogs: AuditLog[]
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>>(`/admin/users/${id}/audit?${searchParams.toString()}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement de l\'audit')
    }

    return response.data.data
  },

  /**
   * Get user's moderation timeline (synthesized view of all events)
   */
  async getUserTimeline(id: string): Promise<UserTimeline> {
    const response = await api.get<ApiResponse<UserTimeline>>(`/admin/users/${id}/timeline`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement de la timeline')
    }

    return response.data.data
  },

  /**
   * Get user's complete activity (publications, comments, reports sent, sanctions)
   */
  async getUserActivity(
    id: string,
    params: { page?: number; limit?: number; type?: 'all' | 'publication' | 'commentaire' | 'report' | 'sanction' } = {}
  ): Promise<{
    stats: { totalPublications: number; totalCommentaires: number; totalReportsSent: number; totalSanctions: number }
    activities: Array<{
      type: 'publication' | 'commentaire' | 'report_sent' | 'sanction'
      date: string
      data: Record<string, unknown>
    }>
    pagination: { page: number; limit: number; total: number; pages: number }
  }> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.append('page', String(params.page))
    if (params.limit) searchParams.append('limit', String(params.limit))
    if (params.type) searchParams.append('type', params.type)

    const response = await api.get<ApiResponse<{
      stats: { totalPublications: number; totalCommentaires: number; totalReportsSent: number; totalSanctions: number }
      activities: Array<{
        type: 'publication' | 'commentaire' | 'report_sent' | 'sanction'
        date: string
        data: Record<string, unknown>
      }>
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(`/admin/users/${id}/activity?${searchParams.toString()}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || "Erreur lors du chargement de l'activité")
    }

    return response.data.data
  },

  /**
   * Get reports created by this user
   */
  async getUserReports(id: string, params: { page?: number; limit?: number } = {}): Promise<{
    reports: UserReport[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.append('page', String(params.page))
    if (params.limit) searchParams.append('limit', String(params.limit))

    const response = await api.get<ApiResponse<{
      reports: UserReport[]
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>>(`/admin/users/${id}/reports?${searchParams.toString()}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des signalements')
    }

    return response.data.data
  },
}

export default usersService
