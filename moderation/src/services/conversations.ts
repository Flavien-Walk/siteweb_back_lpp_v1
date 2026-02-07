import api from './api'
import type { ModerationConversation, ConversationMessage, ApiResponse, PaginatedResponse } from '@/types'

export interface ConversationFilters {
  type?: 'groupe' | 'prive'
  participantId?: string
}

export interface ConversationListParams extends ConversationFilters {
  page?: number
  limit?: number
}

export const conversationsService = {
  async getConversations(params: ConversationListParams = {}): Promise<PaginatedResponse<ModerationConversation>> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await api.get<ApiResponse<{
      conversations: ModerationConversation[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(`/admin/conversations?${searchParams.toString()}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des conversations')
    }

    const { conversations, pagination } = response.data.data
    return {
      items: conversations ?? [],
      currentPage: pagination?.page ?? 1,
      totalPages: pagination?.pages ?? 1,
      totalCount: pagination?.total ?? 0,
      hasNextPage: (pagination?.page ?? 1) < (pagination?.pages ?? 1),
      hasPrevPage: (pagination?.page ?? 1) > 1,
    }
  },

  async getConversationMessages(id: string, params: { page?: number; limit?: number } = {}): Promise<{
    conversation: ModerationConversation
    messages: ConversationMessage[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.append('page', String(params.page))
    if (params.limit) searchParams.append('limit', String(params.limit))

    const response = await api.get<ApiResponse<{
      conversation: ModerationConversation
      messages: ConversationMessage[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(`/admin/conversations/${id}/messages?${searchParams.toString()}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Conversation non trouvée')
    }

    return response.data.data
  },
}

export default conversationsService
