import api from './api'
import type { Publication, ApiResponse, PaginatedResponse } from '@/types'

export interface PublicationFilters {
  type?: string
  status?: 'hidden' | 'visible'
  auteurId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface PublicationListParams extends PublicationFilters {
  page?: number
  limit?: number
}

export const publicationsService = {
  async getPublications(params: PublicationListParams = {}): Promise<PaginatedResponse<Publication>> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get<ApiResponse<{
      publications: Publication[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(`/admin/publications?${searchParams.toString()}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des publications')
    }

    const { publications, pagination } = response.data.data
    return {
      items: publications ?? [],
      currentPage: pagination?.page ?? 1,
      totalPages: pagination?.pages ?? 1,
      totalCount: pagination?.total ?? 0,
      hasNextPage: (pagination?.page ?? 1) < (pagination?.pages ?? 1),
      hasPrevPage: (pagination?.page ?? 1) > 1,
    }
  },

  async getPublication(id: string): Promise<{ publication: Publication; commentaires: any[]; auditHistory: any[] }> {
    const response = await api.get<ApiResponse<{
      publication: Publication
      commentaires: any[]
      auditHistory: any[]
    }>>(`/admin/publications/${id}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Publication non trouvée')
    }

    return response.data.data
  },

  async hidePublication(id: string, reason: string): Promise<void> {
    const response = await api.post<ApiResponse<void>>(
      `/moderation/content/publication/${id}/hide`,
      { reason }
    )
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Impossible de masquer la publication')
    }
  },

  async unhidePublication(id: string, reason?: string): Promise<void> {
    const response = await api.post<ApiResponse<void>>(
      `/moderation/content/publication/${id}/unhide`,
      { reason }
    )
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Impossible de réafficher la publication')
    }
  },

  async deletePublication(id: string, reason: string): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(
      `/moderation/content/publication/${id}`,
      { data: { reason } }
    )
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Impossible de supprimer la publication')
    }
  },
}

export default publicationsService
