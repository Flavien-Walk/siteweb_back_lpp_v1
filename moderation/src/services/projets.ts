import api from './api'
import type { Projet, ApiResponse, PaginatedResponse } from '@/types'

export interface ProjetFilters {
  categorie?: string
  statut?: 'draft' | 'published'
  maturite?: string
  status?: 'hidden' | 'visible'
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface ProjetListParams extends ProjetFilters {
  page?: number
  limit?: number
}

export const projetsService = {
  async getProjets(params: ProjetListParams = {}): Promise<PaginatedResponse<Projet>> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get<ApiResponse<{
      projets: Projet[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(`/admin/projets?${searchParams.toString()}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des projets')
    }

    const { projets, pagination } = response.data.data
    return {
      items: projets ?? [],
      currentPage: pagination?.page ?? 1,
      totalPages: pagination?.pages ?? 1,
      totalCount: pagination?.total ?? 0,
      hasNextPage: (pagination?.page ?? 1) < (pagination?.pages ?? 1),
      hasPrevPage: (pagination?.page ?? 1) > 1,
    }
  },

  async getProjet(id: string): Promise<{ projet: Projet; auditHistory: any[] }> {
    const response = await api.get<ApiResponse<{
      projet: Projet
      auditHistory: any[]
    }>>(`/admin/projets/${id}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Projet non trouvé')
    }

    return response.data.data
  },

  async hideProjet(id: string, reason: string): Promise<void> {
    const response = await api.post<ApiResponse<void>>(
      `/moderation/content/projet/${id}/hide`,
      { reason }
    )
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Impossible de masquer le projet')
    }
  },

  async unhideProjet(id: string, reason?: string): Promise<void> {
    const response = await api.post<ApiResponse<void>>(
      `/moderation/content/projet/${id}/unhide`,
      { reason }
    )
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Impossible de réafficher le projet')
    }
  },

  async deleteProjet(id: string, reason: string): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(
      `/moderation/content/projet/${id}`,
      { data: { reason } }
    )
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Impossible de supprimer le projet')
    }
  },

  async editProjet(id: string, data: { nom?: string; description?: string; pitch?: string; categorie?: string; maturite?: string; secteur?: string; reason?: string }): Promise<Projet> {
    const response = await api.patch<ApiResponse<{ projet: Projet }>>(
      `/moderation/content/projet/${id}`,
      data
    )
    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Impossible de modifier le projet')
    }
    return response.data.data.projet
  },

  async changeStatus(id: string, statut: 'draft' | 'published', reason?: string): Promise<Projet> {
    const response = await api.patch<ApiResponse<{ projet: Projet }>>(
      `/moderation/content/projet/${id}/status`,
      { statut, reason }
    )
    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Impossible de changer le statut')
    }
    return response.data.data.projet
  },
}

export default projetsService
