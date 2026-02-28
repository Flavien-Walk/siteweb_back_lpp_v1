import api from './api'
import type {
  ApiResponse,
  PaginatedResponse,
  MarketplaceOrderAdmin,
  MarketplaceServiceAdmin,
  MarketplaceStats,
  MediationData,
  MediationMessage,
  MediationCanal,
} from '@/types'

export interface OrderListParams {
  page?: number
  limit?: number
  statut?: string
  acheteurId?: string
  vendeurId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  isLate?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export interface ServiceListParams {
  page?: number
  limit?: number
  statut?: string
  categorie?: string
  createurId?: string
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export interface LitigeListParams {
  page?: number
  limit?: number
  includeResolved?: string
  acheteurId?: string
  vendeurId?: string
  dateFrom?: string
  dateTo?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildParams(params: any): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  return searchParams.toString()
}

export const marketplaceService = {
  // ============ COMMANDES ============

  async getCommandes(params: OrderListParams = {}): Promise<PaginatedResponse<MarketplaceOrderAdmin>> {
    const response = await api.get<ApiResponse<{
      commandes: MarketplaceOrderAdmin[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(`/admin/marketplace/commandes?${buildParams(params)}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des commandes')
    }

    const { commandes, pagination } = response.data.data
    return {
      items: commandes ?? [],
      currentPage: pagination?.page ?? 1,
      totalPages: pagination?.pages ?? 1,
      totalCount: pagination?.total ?? 0,
      hasNextPage: (pagination?.page ?? 1) < (pagination?.pages ?? 1),
      hasPrevPage: (pagination?.page ?? 1) > 1,
    }
  },

  async getCommande(id: string): Promise<{ commande: MarketplaceOrderAdmin; review?: unknown }> {
    const response = await api.get<ApiResponse<{ commande: MarketplaceOrderAdmin; review?: unknown }>>(
      `/admin/marketplace/commandes/${id}`
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Commande non trouvee')
    }

    return response.data.data
  },

  async getCommandesStats(): Promise<MarketplaceStats> {
    const response = await api.get<ApiResponse<MarketplaceStats>>('/admin/marketplace/commandes/stats')

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des stats')
    }

    return response.data.data
  },

  // ============ SERVICES ============

  async getServices(params: ServiceListParams = {}): Promise<PaginatedResponse<MarketplaceServiceAdmin>> {
    const response = await api.get<ApiResponse<{
      services: MarketplaceServiceAdmin[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(`/admin/marketplace/services?${buildParams(params)}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des services')
    }

    const { services, pagination } = response.data.data
    return {
      items: services ?? [],
      currentPage: pagination?.page ?? 1,
      totalPages: pagination?.pages ?? 1,
      totalCount: pagination?.total ?? 0,
      hasNextPage: (pagination?.page ?? 1) < (pagination?.pages ?? 1),
      hasPrevPage: (pagination?.page ?? 1) > 1,
    }
  },

  async getService(id: string): Promise<{ service: MarketplaceServiceAdmin; reviews: unknown[]; stats: { totalCommandes: number; commandesParStatut: Record<string, number> } }> {
    const response = await api.get<ApiResponse<{
      service: MarketplaceServiceAdmin
      reviews: unknown[]
      stats: { totalCommandes: number; commandesParStatut: Record<string, number> }
    }>>(`/admin/marketplace/services/${id}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Service non trouve')
    }

    return response.data.data
  },

  // ============ LITIGES ============

  async getLitiges(params: LitigeListParams = {}): Promise<PaginatedResponse<MarketplaceOrderAdmin>> {
    const response = await api.get<ApiResponse<{
      litiges: MarketplaceOrderAdmin[]
      pagination: { page: number; limit: number; total: number; pages: number }
    }>>(`/admin/marketplace/litiges?${buildParams(params)}`)

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des litiges')
    }

    const { litiges, pagination } = response.data.data
    return {
      items: litiges ?? [],
      currentPage: pagination?.page ?? 1,
      totalPages: pagination?.pages ?? 1,
      totalCount: pagination?.total ?? 0,
      hasNextPage: (pagination?.page ?? 1) < (pagination?.pages ?? 1),
      hasPrevPage: (pagination?.page ?? 1) > 1,
    }
  },

  async resoudreLitige(id: string, resolution: string, action: 'reprendre' | 'annuler'): Promise<MarketplaceOrderAdmin> {
    const response = await api.post<ApiResponse<{ commande: MarketplaceOrderAdmin }>>(
      `/admin/marketplace/litiges/${id}/resoudre`,
      { resolution, action }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de la resolution du litige')
    }

    return response.data.data.commande
  },

  // ============ MEDIATION ============

  async getMediationMessages(litigeId: string): Promise<MediationData> {
    const response = await api.get<ApiResponse<MediationData>>(
      `/admin/marketplace/litiges/${litigeId}/mediation`
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des messages')
    }

    return response.data.data
  },

  async sendMediationMessage(
    litigeId: string,
    canal: MediationCanal,
    contenu: string
  ): Promise<MediationMessage> {
    const response = await api.post<ApiResponse<{ message: MediationMessage }>>(
      `/admin/marketplace/litiges/${litigeId}/mediation`,
      { canal, contenu }
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || "Erreur lors de l'envoi du message")
    }

    return response.data.data.message
  },

  async prendreEnCharge(litigeId: string): Promise<MarketplaceOrderAdmin> {
    const response = await api.post<ApiResponse<{ commande: MarketplaceOrderAdmin }>>(
      `/admin/marketplace/litiges/${litigeId}/prendre-en-charge`,
      {}
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de la prise en charge')
    }

    return response.data.data.commande
  },
}

export default marketplaceService
