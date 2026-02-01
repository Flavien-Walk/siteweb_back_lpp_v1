import api from './api'
import type { StaffMessage, ApiResponse, PaginatedResponse } from '@/types'

export interface ChatListParams {
  page?: number
  limit?: number
  before?: string // cursor-based pagination
}

export const chatService = {
  /**
   * Get staff chat messages
   */
  async getMessages(params: ChatListParams = {}): Promise<PaginatedResponse<StaffMessage>> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get<ApiResponse<{
      messages?: StaffMessage[]
      items?: StaffMessage[]
      pagination?: { page: number; limit: number; total: number; pages: number }
      currentPage?: number
      totalPages?: number
      totalCount?: number
    }>>(
      `/admin/chat?${searchParams.toString()}`
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des messages')
    }

    const data = response.data.data
    // Normalize response format
    const items = data.items ?? data.messages ?? []
    const pagination = data.pagination

    return {
      items,
      currentPage: data.currentPage ?? pagination?.page ?? 1,
      totalPages: data.totalPages ?? pagination?.pages ?? 1,
      totalCount: data.totalCount ?? pagination?.total ?? items.length,
    }
  },

  /**
   * Send a message
   */
  async sendMessage(content: string, linkedReportId?: string): Promise<StaffMessage> {
    const response = await api.post<ApiResponse<{ message: StaffMessage }>>(
      '/admin/chat',
      { content, linkedReportId }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de l\'envoi du message')
    }

    return response.data.data.message
  },

  /**
   * Delete a message (admin only)
   */
  async deleteMessage(id: string): Promise<void> {
    const response = await api.delete<ApiResponse<null>>(`/admin/chat/${id}`)

    if (!response.data.succes) {
      throw new Error(response.data.message || 'Erreur lors de la suppression')
    }
  },

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get<ApiResponse<{ count: number }>>('/admin/chat/unread')

    if (!response.data.succes || !response.data.data) {
      return 0
    }

    return response.data.data.count
  },

  /**
   * Mark messages as read
   * Silently ignores errors (non-critical operation)
   */
  async markAsRead(): Promise<void> {
    try {
      await api.post<ApiResponse<null>>('/admin/chat/read', {})
    } catch (err) {
      // Non-critical - log in dev but don't throw
      if (import.meta.env.DEV) {
        console.warn('[Chat] markAsRead failed:', err)
      }
    }
  },
}

export default chatService
