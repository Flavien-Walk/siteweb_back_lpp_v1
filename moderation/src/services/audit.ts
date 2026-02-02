import api from './api'
import type { AuditLog, ApiResponse, PaginatedResponse } from '@/types'

export type AuditSource = 'web' | 'mobile' | 'api' | 'system'

export interface AuditFilters {
  action?: string
  moderatorId?: string
  targetUserId?: string
  dateFrom?: string
  dateTo?: string
  source?: AuditSource
}

export interface AuditListParams extends AuditFilters {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export const auditService = {
  /**
   * Get paginated list of audit logs with filters
   */
  async getLogs(params: AuditListParams = {}): Promise<PaginatedResponse<AuditLog>> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get<ApiResponse<{
      logs?: AuditLog[]
      items?: AuditLog[]
      pagination?: { page: number; limit: number; total: number; pages: number }
      currentPage?: number
      totalPages?: number
      totalCount?: number
    }>>(
      `/admin/audit?${searchParams.toString()}`
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des logs')
    }

    const data = response.data.data
    // Normalize backend response (could be { logs, pagination } or { items, ... })
    const items = data.items ?? data.logs ?? []
    const pagination = data.pagination

    return {
      items,
      currentPage: data.currentPage ?? pagination?.page ?? 1,
      totalPages: data.totalPages ?? pagination?.pages ?? 1,
      totalCount: data.totalCount ?? pagination?.total ?? items.length,
      hasNextPage: (data.currentPage ?? pagination?.page ?? 1) < (data.totalPages ?? pagination?.pages ?? 1),
      hasPrevPage: (data.currentPage ?? pagination?.page ?? 1) > 1,
    }
  },

  /**
   * Get available action types for filtering
   */
  async getActionTypes(): Promise<string[]> {
    const response = await api.get<ApiResponse<{ actions: string[] }>>('/admin/audit/actions')

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des types d\'actions')
    }

    return response.data.data.actions
  },

  /**
   * Export audit logs as CSV
   */
  async exportCsv(params: AuditFilters = {}): Promise<Blob> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get(`/admin/audit/export?${searchParams.toString()}`, {
      responseType: 'blob',
    })

    return response.data
  },

  /**
   * Get audit stats
   */
  async getStats(): Promise<{
    totalToday: number
    totalWeek: number
    byAction: Record<string, number>
    byModerator: Array<{ moderator: { _id: string; prenom: string; nom: string }; count: number }>
  }> {
    const response = await api.get<ApiResponse<{
      totalToday: number
      totalWeek: number
      byAction: Record<string, number>
      byModerator: Array<{ moderator: { _id: string; prenom: string; nom: string }; count: number }>
    }>>('/admin/audit/stats')

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des stats')
    }

    return response.data.data
  },
}

export default auditService
