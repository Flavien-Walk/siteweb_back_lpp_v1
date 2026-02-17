import api from './api'
import type { AdminGamificationData, ApiResponse } from '@/types'

export const gamificationService = {
  /**
   * Recuperer les donnees gamification d'un utilisateur (lecture seule)
   */
  getAdminGamification: async (userId: string): Promise<ApiResponse<AdminGamificationData>> => {
    const { data } = await api.get(`/admin/gamification/${userId}`)
    return data
  },
}
