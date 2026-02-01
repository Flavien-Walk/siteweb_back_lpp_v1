import api from './api'
import type { Report, ApiResponse, PaginatedResponse, ReportStatus, ReportReason } from '@/types'

export interface ReportFilters {
  status?: ReportStatus
  reason?: ReportReason
  priority?: 'low' | 'medium' | 'high' | 'critical'
  reporterId?: string
  targetUserId?: string
  assignedTo?: string
  dateFrom?: string
  dateTo?: string
}

export interface ReportListParams extends ReportFilters {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface ReportAction {
  action: 'approve' | 'reject' | 'escalate' | 'assign'
  reason?: string
  assignTo?: string
}

export const reportsService = {
  /**
   * Get paginated list of reports with filters
   */
  async getReports(params: ReportListParams = {}): Promise<PaginatedResponse<Report>> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get<ApiResponse<{
      reports: Report[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(
      `/admin/reports?${searchParams.toString()}`
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des signalements')
    }

    // Transform backend response to match PaginatedResponse interface
    const { reports, pagination } = response.data.data
    return {
      items: reports,
      currentPage: pagination.page,
      totalPages: pagination.pages,
      totalCount: pagination.total,
      hasNextPage: pagination.page < pagination.pages,
      hasPrevPage: pagination.page > 1,
    }
  },

  /**
   * Get a single report by ID
   */
  async getReport(id: string): Promise<Report> {
    const response = await api.get<ApiResponse<{ report: Report }>>(`/admin/reports/${id}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Signalement non trouvé')
    }

    return response.data.data.report
  },

  /**
   * Process a report (approve/reject/escalate)
   */
  async processReport(id: string, action: ReportAction): Promise<Report> {
    const response = await api.post<ApiResponse<{ report: Report }>>(
      `/admin/reports/${id}/process`,
      action
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du traitement')
    }

    return response.data.data.report
  },

  /**
   * Assign report to a moderator
   */
  async assignReport(id: string, moderatorId: string): Promise<Report> {
    const response = await api.post<ApiResponse<{ report: Report }>>(
      `/admin/reports/${id}/assign`,
      { assignTo: moderatorId }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de l\'assignation')
    }

    return response.data.data.report
  },

  /**
   * Get report statistics
   */
  async getStats(): Promise<{
    pending: number
    inProgress: number
    escalated: number
    resolved: number
    byType: Record<string, number>
    byPriority: Record<string, number>
  }> {
    const response = await api.get<ApiResponse<{
      pending: number
      inProgress: number
      escalated: number
      resolved: number
      byType: Record<string, number>
      byPriority: Record<string, number>
    }>>('/admin/reports/stats')

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des stats')
    }

    return response.data.data
  },

  /**
   * Add a note to a report
   */
  async addNote(id: string, content: string): Promise<Report> {
    const response = await api.post<ApiResponse<{ report: Report }>>(
      `/admin/reports/${id}/notes`,
      { content }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de l\'ajout de la note')
    }

    return response.data.data.report
  },
}

export default reportsService
