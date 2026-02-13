import api from './api'
import type { StaffMessage, DMConversation, ApiResponse, PaginatedResponse } from '@/types'

export interface ChatListParams {
  page?: number
  limit?: number
  before?: string // cursor-based pagination
}

// Backend message format (uses 'sender' instead of 'author')
interface BackendMessage {
  _id: string
  sender?: {
    _id: string
    prenom: string
    nom: string
    avatar?: string
    role?: string
  }
  author?: {
    _id: string
    prenom: string
    nom: string
    avatar?: string
    role?: string
  }
  content: string
  linkedReport?: {
    _id: string
    targetType?: string
    reason?: string
    status?: string
  }
  dateCreation: string
}

/**
 * Normalize backend message: map 'sender' to 'author'
 */
function normalizeMessage(msg: BackendMessage): StaffMessage {
  return {
    _id: msg._id,
    author: msg.author ?? msg.sender,
    recipient: (msg as any).recipient ?? undefined,
    content: msg.content,
    linkedReport: msg.linkedReport,
    dateCreation: msg.dateCreation,
  }
}

export const chatService = {
  /**
   * Get staff chat messages
   * Backend: GET /api/admin/chat
   * Response: { messages: BackendMessage[], hasMore: boolean }
   * Note: Backend returns 'sender' field, we normalize to 'author'
   */
  async getMessages(params: ChatListParams = {}): Promise<PaginatedResponse<StaffMessage>> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get<ApiResponse<{
      messages?: BackendMessage[]
      items?: BackendMessage[]
      hasMore?: boolean
      pagination?: { page: number; limit: number; total: number; pages: number }
    }>>(
      `/admin/chat?${searchParams.toString()}`
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des messages')
    }

    const data = response.data.data
    // Normalize: backend returns { messages, hasMore } with 'sender' field
    const rawItems = data.items ?? data.messages ?? []
    const items = rawItems.map(normalizeMessage)
    const pagination = data.pagination

    return {
      items,
      currentPage: pagination?.page ?? 1,
      totalPages: pagination?.pages ?? 1,
      totalCount: pagination?.total ?? items.length,
      hasNextPage: data.hasMore ?? false,
    }
  },

  /**
   * Send a message
   * Backend: POST /api/admin/chat
   * Body: { content: string, linkedReportId?: string }
   * Note: Backend returns 'sender' field, we normalize to 'author'
   */
  async sendMessage(content: string, linkedReportId?: string): Promise<StaffMessage> {
    const response = await api.post<ApiResponse<{ message: BackendMessage }>>(
      '/admin/chat',
      { content, linkedReportId }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de l\'envoi du message')
    }

    return normalizeMessage(response.data.data.message)
  },

  /**
   * Delete a message (admin only)
   * Backend: DELETE /api/admin/chat/:id
   */
  async deleteMessage(id: string): Promise<void> {
    const response = await api.delete<ApiResponse<null>>(`/admin/chat/${id}`)

    if (!response.data.succes) {
      throw new Error(response.data.message || 'Erreur lors de la suppression')
    }
  },

  /**
   * Get unread count
   * Backend: GET /api/admin/chat/unread
   * Response: { unreadCount: number }
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get<ApiResponse<{ unreadCount?: number; count?: number }>>('/admin/chat/unread')

      if (!response.data.succes || !response.data.data) {
        return 0
      }

      // Backend returns { unreadCount } not { count }
      return response.data.data.unreadCount ?? response.data.data.count ?? 0
    } catch {
      return 0
    }
  },

  /**
   * Mark messages as read
   * Backend: POST /api/admin/chat/read
   * Body: { messageIds: string[] } - REQUIRED non-empty array
   *
   * @param messageIds - Array of message IDs to mark as read. If empty, skips the call.
   */
  async markAsRead(messageIds: string[]): Promise<void> {
    // Guard: backend requires non-empty messageIds array
    if (!messageIds || messageIds.length === 0) {
      if (import.meta.env.DEV) {
        console.debug('[Chat] markAsRead skipped: no messageIds provided')
      }
      return
    }

    try {
      if (import.meta.env.DEV) {
        console.debug('[Chat] markAsRead payload:', { messageIds })
      }

      await api.post<ApiResponse<null>>('/admin/chat/read', { messageIds })
    } catch (err) {
      // Non-critical - log in dev but don't throw
      if (import.meta.env.DEV) {
        console.warn('[Chat] markAsRead failed:', err)
      }
    }
  },

  // ============ MESSAGES PRIVES (DM) ============

  /**
   * Get DM conversations list
   * GET /api/admin/chat/dm
   */
  async getDMConversations(): Promise<DMConversation[]> {
    const response = await api.get<ApiResponse<{ conversations: DMConversation[] }>>('/admin/chat/dm')

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des conversations')
    }

    return response.data.data.conversations
  },

  /**
   * Get DM messages with a specific user
   * GET /api/admin/chat/dm/:userId
   */
  async getDMMessages(userId: string, params: ChatListParams = {}): Promise<{
    messages: StaffMessage[]
    otherUser: { _id: string; prenom: string; nom: string; avatar?: string; role?: string } | null
    hasMore: boolean
  }> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get<ApiResponse<{
      messages: BackendMessage[]
      otherUser: any
      hasMore: boolean
    }>>(`/admin/chat/dm/${userId}?${searchParams.toString()}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des messages')
    }

    return {
      messages: response.data.data.messages.map(normalizeMessage),
      otherUser: response.data.data.otherUser,
      hasMore: response.data.data.hasMore,
    }
  },

  /**
   * Send a DM to a specific user
   * POST /api/admin/chat/dm/:userId
   */
  async sendDM(userId: string, content: string): Promise<StaffMessage> {
    const response = await api.post<ApiResponse<{ message: BackendMessage }>>(
      `/admin/chat/dm/${userId}`,
      { content }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de l\'envoi du message')
    }

    return normalizeMessage(response.data.data.message)
  },
}

export default chatService
