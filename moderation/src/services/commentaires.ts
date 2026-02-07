import api from './api'
import type { Commentaire, ApiResponse, PaginatedResponse } from '@/types'

export interface CommentaireFilters {
  publicationId?: string
  auteurId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface CommentaireListParams extends CommentaireFilters {
  page?: number
  limit?: number
}

export const commentairesService = {
  async getCommentaires(params: CommentaireListParams = {}): Promise<PaginatedResponse<Commentaire>> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get<ApiResponse<{
      commentaires: Commentaire[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(`/admin/commentaires?${searchParams.toString()}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des commentaires')
    }

    const { commentaires, pagination } = response.data.data
    return {
      items: commentaires ?? [],
      currentPage: pagination?.page ?? 1,
      totalPages: pagination?.pages ?? 1,
      totalCount: pagination?.total ?? 0,
      hasNextPage: (pagination?.page ?? 1) < (pagination?.pages ?? 1),
      hasPrevPage: (pagination?.page ?? 1) > 1,
    }
  },

  async deleteCommentaire(id: string, reason: string): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(
      `/moderation/content/commentaire/${id}`,
      { data: { reason } }
    )
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Impossible de supprimer le commentaire')
    }
  },
}

export default commentairesService
