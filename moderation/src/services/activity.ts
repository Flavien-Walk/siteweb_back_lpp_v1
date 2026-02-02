import api from './api'
import type { ApiResponse } from '@/types'

export interface ActivityLog {
  _id: string
  actor: string
  actorRole: string
  action: 'share' | 'view' | 'bookmark' | 'click'
  targetType: 'publication' | 'commentaire' | 'story' | 'live' | 'projet' | 'profil'
  targetId: string
  metadata?: Record<string, unknown>
  source: 'web' | 'mobile' | 'api'
  dateCreation: string
}

export interface ActivityStats {
  share?: { count: number; lastActivity: string }
  view?: { count: number; lastActivity: string }
  bookmark?: { count: number; lastActivity: string }
  click?: { count: number; lastActivity: string }
}

export interface UserActivityParams {
  page?: number
  limit?: number
  action?: 'share' | 'view' | 'bookmark' | 'click'
}

export const activityService = {
  /**
   * Get user's activity logs (shares, views, etc.)
   * Uses the new /api/activity/user/:userId endpoint
   */
  async getUserActivity(
    userId: string,
    params: UserActivityParams = {}
  ): Promise<{
    activities: ActivityLog[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.append('page', String(params.page))
    if (params.limit) searchParams.append('limit', String(params.limit))
    if (params.action) searchParams.append('action', params.action)

    const response = await api.get<ApiResponse<{
      activities: ActivityLog[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(`/activity/user/${userId}?${searchParams.toString()}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || "Erreur lors du chargement de l'activité")
    }

    return response.data.data
  },

  /**
   * Get activity stats for a specific target (publication, profile, etc.)
   */
  async getTargetStats(targetType: string, targetId: string): Promise<ActivityStats> {
    const response = await api.get<ApiResponse<{
      targetType: string
      targetId: string
      stats: ActivityStats
    }>>(`/activity/stats/${targetType}/${targetId}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des stats')
    }

    return response.data.data.stats
  },
}

export default activityService
