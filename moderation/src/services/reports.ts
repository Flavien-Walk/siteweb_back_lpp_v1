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

/**
 * Frontend action interface
 * - approve: Mark as action_taken (content was moderated)
 * - reject: Mark as dismissed (false positive)
 * - escalate: Escalate to higher-level moderator (uses separate endpoint)
 */
export interface ReportAction {
  action: 'approve' | 'reject' | 'escalate'
  reason?: string
}

/**
 * Backend expects for PATCH/POST /admin/reports/:id/process:
 * - status: 'reviewed' | 'action_taken' | 'dismissed'
 * - action?: 'none' | 'hide_post' | 'delete_post' | 'warn_user' | 'suspend_user'
 * - adminNote?: string
 */
interface BackendProcessPayload {
  status: 'reviewed' | 'action_taken' | 'dismissed'
  action?: 'none' | 'hide_post' | 'delete_post' | 'warn_user' | 'suspend_user'
  adminNote?: string
}

export const reportsService = {
  /**
   * Get paginated list of reports with filters
   * Backend: GET /api/admin/reports
   * Response: { reports: Report[], pagination: {...} }
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
      items: reports ?? [],
      currentPage: pagination?.page ?? 1,
      totalPages: pagination?.pages ?? 1,
      totalCount: pagination?.total ?? 0,
      hasNextPage: (pagination?.page ?? 1) < (pagination?.pages ?? 1),
      hasPrevPage: (pagination?.page ?? 1) > 1,
    }
  },

  /**
   * Get a single report by ID
   * Backend: GET /api/admin/reports/:id
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
   *
   * Backend endpoints:
   * - POST /api/admin/reports/:id/process (for approve/reject)
   *   Body: { status, action?, adminNote? }
   * - POST /api/admin/reports/:id/escalate (for escalate)
   *   Body: { reason? }
   *
   * Mapping:
   * - approve → { status: 'action_taken', action: 'none', adminNote }
   * - reject  → { status: 'dismissed', adminNote }
   * - escalate → uses /escalate endpoint with { reason }
   */
  async processReport(id: string, frontendAction: ReportAction): Promise<Report> {
    // Handle escalate via separate endpoint
    if (frontendAction.action === 'escalate') {
      const response = await api.post<ApiResponse<{ report: Report }>>(
        `/admin/reports/${id}/escalate`,
        { reason: frontendAction.reason || undefined }
      )

      if (!response.data.succes || !response.data.data) {
        throw new Error(response.data.message || 'Erreur lors de l\'escalade')
      }

      return response.data.data.report
    }

    // Map frontend action to backend payload
    let payload: BackendProcessPayload

    if (frontendAction.action === 'approve') {
      // Approve = action was taken on the reported content
      payload = {
        status: 'action_taken',
        action: 'none', // Default to 'none' - moderator can do specific actions elsewhere
        adminNote: frontendAction.reason || undefined,
      }
    } else {
      // Reject = dismissed as false positive
      payload = {
        status: 'dismissed',
        adminNote: frontendAction.reason || undefined,
      }
    }

    // Remove undefined values to keep payload clean
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined)
    )

    if (import.meta.env.DEV) {
      console.debug('[Reports] processReport payload:', { id, frontendAction, cleanPayload })
    }

    const response = await api.post<ApiResponse<{ report: Report }>>(
      `/admin/reports/${id}/process`,
      cleanPayload
    )

    if (!response.data.succes || !response.data.data) {
      // Log detailed error in dev
      if (import.meta.env.DEV) {
        console.error('[Reports] processReport error:', response.data)
      }
      throw new Error(response.data.message || 'Erreur lors du traitement')
    }

    return response.data.data.report
  },

  /**
   * Assign report to a moderator
   * Backend: POST /api/admin/reports/:id/assign
   * Body: { assigneeId: string }
   */
  async assignReport(id: string, moderatorId: string): Promise<Report> {
    const response = await api.post<ApiResponse<{ report: Report }>>(
      `/admin/reports/${id}/assign`,
      { assigneeId: moderatorId }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de l\'assignation')
    }

    return response.data.data.report
  },

  /**
   * Get report statistics
   * Backend: GET /api/admin/reports/stats
   */
  async getStats(): Promise<{
    totalPending: number
    totalEscalated: number
    byStatus: Record<string, number>
    byReason: Array<{ _id: string; count: number }>
    byPriority: Record<string, number>
  }> {
    const response = await api.get<ApiResponse<{
      totalPending: number
      totalEscalated: number
      byStatus: Record<string, number>
      byReason: Array<{ _id: string; count: number }>
      byPriority: Record<string, number>
    }>>('/admin/reports/stats')

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des stats')
    }

    return response.data.data
  },

  /**
   * Add a note to a report
   * NOTE: Backend endpoint /admin/reports/:id/notes does NOT exist.
   * This will fail with 404. Kept for future implementation.
   */
  async addNote(id: string, content: string): Promise<Report> {
    if (import.meta.env.DEV) {
      console.warn('[Reports] addNote: endpoint not implemented in backend')
    }

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
