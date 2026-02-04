import api from './api'
import type { ApiResponse, PaginatedResponse } from '@/types'

// ============ TYPES ============

export type FilterPreset = 'normal' | 'warm' | 'cool' | 'bw' | 'contrast' | 'vignette'

export interface StoryLocation {
  label: string
  lat?: number
  lng?: number
}

export interface StoryAuthor {
  _id: string
  prenom: string
  nom: string
  avatar?: string
  email?: string
  role?: string
}

export interface ModerationStory {
  _id: string
  utilisateur: StoryAuthor
  type: 'photo' | 'video'
  mediaUrl: string
  thumbnailUrl?: string
  durationSec: number
  location?: StoryLocation
  filterPreset?: FilterPreset
  dateCreation: string
  dateExpiration: string
  isHidden: boolean
  hiddenReason?: string
  hiddenBy?: StoryAuthor
  hiddenAt?: string
  viewersCount: number
  isExpired?: boolean
  isActive?: boolean
}

export interface StoryFilters {
  userId?: string
  status?: 'all' | 'active' | 'hidden' | 'expired'
  dateFrom?: string
  dateTo?: string
}

export interface StoryListParams extends StoryFilters {
  page?: number
  limit?: number
}

export interface AuditHistoryItem {
  _id: string
  action: string
  reason?: string
  actor?: StoryAuthor
  metadata?: Record<string, unknown>
  snapshot?: Record<string, unknown>
  createdAt: string
}

// ============ SERVICE ============

export const storiesService = {
  /**
   * Get paginated list of stories for moderation
   * Backend: GET /api/moderation/stories
   */
  async getStories(params: StoryListParams = {}): Promise<PaginatedResponse<ModerationStory>> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get<ApiResponse<{
      stories: ModerationStory[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(
      `/moderation/stories?${searchParams.toString()}`
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des stories')
    }

    const { stories, pagination } = response.data.data
    return {
      items: stories ?? [],
      currentPage: pagination?.page ?? 1,
      totalPages: pagination?.pages ?? 1,
      totalCount: pagination?.total ?? 0,
      hasNextPage: (pagination?.page ?? 1) < (pagination?.pages ?? 1),
      hasPrevPage: (pagination?.page ?? 1) > 1,
    }
  },

  /**
   * Get single story details
   * Backend: GET /api/moderation/stories/:id
   */
  async getStory(id: string): Promise<{ story: ModerationStory; auditHistory: AuditHistoryItem[] }> {
    const response = await api.get<ApiResponse<{
      story: ModerationStory
      auditHistory: AuditHistoryItem[]
    }>>(
      `/moderation/stories/${id}`
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Story non trouvée')
    }

    return response.data.data
  },

  /**
   * Hide a story
   * Backend: POST /api/moderation/stories/:id/hide
   */
  async hideStory(id: string, reason: string): Promise<{ eventId: string }> {
    const response = await api.post<ApiResponse<{ eventId: string }>>(
      `/moderation/stories/${id}/hide`,
      { reason }
    )

    if (!response.data.succes) {
      throw new Error(response.data.message || 'Impossible de masquer la story')
    }

    return response.data.data!
  },

  /**
   * Unhide a story
   * Backend: POST /api/moderation/stories/:id/unhide
   */
  async unhideStory(id: string, reason?: string): Promise<{ eventId: string }> {
    const response = await api.post<ApiResponse<{ eventId: string }>>(
      `/moderation/stories/${id}/unhide`,
      { reason }
    )

    if (!response.data.succes) {
      throw new Error(response.data.message || 'Impossible de réafficher la story')
    }

    return response.data.data!
  },

  /**
   * Delete a story permanently
   * Backend: DELETE /api/moderation/stories/:id
   */
  async deleteStory(id: string, reason: string): Promise<{ eventId: string }> {
    const response = await api.delete<ApiResponse<{ eventId: string }>>(
      `/moderation/stories/${id}`,
      { data: { reason } }
    )

    if (!response.data.succes) {
      throw new Error(response.data.message || 'Impossible de supprimer la story')
    }

    return response.data.data!
  },
}

// Filter preset labels
export const FILTER_LABELS: Record<FilterPreset, string> = {
  normal: 'Normal',
  warm: 'Chaud',
  cool: 'Froid',
  bw: 'N&B',
  contrast: 'Contraste',
  vignette: 'Vignette',
}
