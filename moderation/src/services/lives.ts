import api from './api'
import type { Live, ApiResponse, PaginatedResponse } from '@/types'

export interface LiveFilters {
  status?: 'live' | 'ended'
}

export interface LiveListParams extends LiveFilters {
  page?: number
  limit?: number
}

export const livesService = {
  async getLives(params: LiveListParams = {}): Promise<PaginatedResponse<Live>> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get<ApiResponse<{
      lives: Live[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(`/admin/lives?${searchParams.toString()}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des lives')
    }

    const { lives, pagination } = response.data.data
    return {
      items: lives ?? [],
      currentPage: pagination?.page ?? 1,
      totalPages: pagination?.pages ?? 1,
      totalCount: pagination?.total ?? 0,
      hasNextPage: (pagination?.page ?? 1) < (pagination?.pages ?? 1),
      hasPrevPage: (pagination?.page ?? 1) > 1,
    }
  },
}

export default livesService
