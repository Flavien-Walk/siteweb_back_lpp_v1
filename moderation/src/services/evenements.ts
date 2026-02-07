import api from './api'
import type { Evenement, ApiResponse, PaginatedResponse } from '@/types'

export interface EvenementFilters {
  type?: 'live' | 'replay' | 'qr'
  statut?: 'a-venir' | 'en-cours' | 'termine'
}

export interface EvenementListParams extends EvenementFilters {
  page?: number
  limit?: number
}

export const evenementsService = {
  async getEvenements(params: EvenementListParams = {}): Promise<PaginatedResponse<Evenement>> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get<ApiResponse<{
      evenements: Evenement[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(`/admin/evenements?${searchParams.toString()}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des événements')
    }

    const { evenements, pagination } = response.data.data
    return {
      items: evenements ?? [],
      currentPage: pagination?.page ?? 1,
      totalPages: pagination?.pages ?? 1,
      totalCount: pagination?.total ?? 0,
      hasNextPage: (pagination?.page ?? 1) < (pagination?.pages ?? 1),
      hasPrevPage: (pagination?.page ?? 1) > 1,
    }
  },
}

export default evenementsService
