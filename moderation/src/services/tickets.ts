import api from './api'
import type { SupportTicket, TicketStatus, TicketCategory, TicketPriority, ApiResponse, PaginatedResponse } from '@/types'

export interface TicketListParams {
  page?: number
  limit?: number
  status?: TicketStatus
  category?: TicketCategory
  priority?: TicketPriority
  assignedTo?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export const ticketsService = {
  async getTickets(params: TicketListParams = {}): Promise<PaginatedResponse<SupportTicket>> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get<ApiResponse<{
      tickets: SupportTicket[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(`/admin/tickets?${searchParams.toString()}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des tickets')
    }

    const { tickets, pagination } = response.data.data
    return {
      items: tickets ?? [],
      currentPage: pagination?.page ?? 1,
      totalPages: pagination?.pages ?? 1,
      totalCount: pagination?.total ?? 0,
      hasNextPage: (pagination?.page ?? 1) < (pagination?.pages ?? 1),
      hasPrevPage: (pagination?.page ?? 1) > 1,
    }
  },

  async getTicket(id: string): Promise<SupportTicket> {
    const response = await api.get<ApiResponse<{ ticket: SupportTicket }>>(`/admin/tickets/${id}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Ticket non trouvé')
    }

    return response.data.data.ticket
  },

  async respondToTicket(id: string, content: string): Promise<SupportTicket> {
    const response = await api.post<ApiResponse<{ ticket: SupportTicket }>>(
      `/admin/tickets/${id}/respond`,
      { content }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de la réponse')
    }

    return response.data.data.ticket
  },

  async changeStatus(id: string, status: TicketStatus): Promise<SupportTicket> {
    const response = await api.patch<ApiResponse<{ ticket: SupportTicket }>>(
      `/admin/tickets/${id}/status`,
      { status }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du changement de statut')
    }

    return response.data.data.ticket
  },

  async assignTicket(id: string, assigneeId: string): Promise<SupportTicket> {
    const response = await api.post<ApiResponse<{ ticket: SupportTicket }>>(
      `/admin/tickets/${id}/assign`,
      { assigneeId }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de l\'assignation')
    }

    return response.data.data.ticket
  },

  async getStats(): Promise<{ enAttente: number; enCours: number; termine: number }> {
    const response = await api.get<ApiResponse<{
      enAttente: number
      enCours: number
      termine: number
    }>>('/admin/tickets/stats')

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des stats')
    }

    return response.data.data
  },
}

export default ticketsService
