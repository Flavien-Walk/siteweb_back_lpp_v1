import api from './api'
import type { ApiResponse, DashboardStats } from '@/types'

export const dashboardService = {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<ApiResponse<DashboardStats>>('/admin/dashboard')

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur de récupération des stats')
    }

    return response.data.data
  },
}

export default dashboardService
