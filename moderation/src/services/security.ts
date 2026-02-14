import api from './api'
import type { ApiResponse } from '@/types'

// ============================================
// TYPES EVENEMENTS DE SECURITE
// ============================================

export type SecurityEventType =
  | 'brute_force'
  | 'rate_limit_hit'
  | 'unauthorized_access'
  | 'forbidden_access'
  | 'injection_attempt'
  | 'suspicious_signup'
  | 'token_forgery'
  | 'cors_violation'
  | 'ip_blocked'
  | 'anomaly'

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'
export type ThreatLevel = 'normal' | 'elevated' | 'high' | 'critical'

export interface SecurityEvent {
  _id: string
  type: SecurityEventType
  severity: SeverityLevel
  ip: string
  userAgent: string
  navigateur: string
  os: string
  appareil: string
  method: string
  path: string
  statusCode: number
  details: string
  blocked: boolean
  dateCreation: string
  metadata?: Record<string, unknown>
  userId?: string
}

export interface SuspiciousIP {
  ip: string
  count: number
  types: string[]
  lastSeen: string
  maxSeverity: string
  navigateurs: string[]
  appareils: string[]
  os: string[]
}

export interface OffenderIP {
  ip: string
  totalEvents: number
  criticalCount: number
  types: string[]
  firstSeen: string
  lastSeen: string
  navigateurs: string[]
  os: string[]
  appareils: string[]
}

export interface AttackedPath {
  path: string
  count: number
  types: string[]
}

export interface HourlyPoint {
  _id: { hour: number; day: number }
  total: number
  critical: number
  high: number
  blocked: number
}

export interface DailyPoint {
  _id: string
  total: number
  critical: number
  high: number
  medium: number
  low: number
}

export interface DeviceStats {
  navigateurs: { nom: string; count: number }[]
  os: { nom: string; count: number }[]
  appareils: { nom: string; count: number }[]
}

export interface BlockedIP {
  _id: string
  ip: string
  raison: string
  bloquePar: { _id: string; prenom: string; nom: string } | null
  dateCreation: string
  expireAt?: string | null
  actif: boolean
}

export interface BannedDevice {
  _id: string
  fingerprint: string
  userAgentRaw: string
  navigateur: string
  os: string
  appareil: string
  raison: string
  bloquePar: { _id: string; prenom: string; nom: string } | null
  actif: boolean
  ipsConnues: string[]
  dateCreation: string
  expireAt?: string | null
}

export interface PurgeHistoryItem {
  _id: string
  purgePar: string
  note: string
  stats: { events: number; blockedIPs: number; bannedDevices: number }
  dateCreation: string
}

export interface PurgeDetail extends PurgeHistoryItem {
  archivedEvents: SecurityEvent[]
  archivedBlockedIPs: BlockedIP[]
  archivedBannedDevices: BannedDevice[]
}

export interface SecurityDashboardData {
  threatLevel: ThreatLevel
  lastUpdated: string

  summary: {
    totalEvents1h: number
    totalEvents24h: number
    totalEvents7j: number
    criticalEvents24h: number
    highEvents24h: number
    blockedEvents24h: number
    blockedIPsActifs: number
    eventsPerHour: number
  }

  attackTypes: Record<string, number>

  severityBreakdown: {
    critical: number
    high: number
    medium: number
    low: number
  }

  deviceStats: DeviceStats

  topSuspiciousIPs: SuspiciousIP[]
  recentEvents: SecurityEvent[]
  hourlyTrend: HourlyPoint[]
  dailyTrend: DailyPoint[]
  topAttackedPaths: AttackedPath[]
  criticalEvents: SecurityEvent[]
  topOffenderIPs: OffenderIP[]
  blockedIPs: BlockedIP[]
}

// ============================================
// TYPES INVESTIGATION IP
// ============================================

export interface IPInvestigation {
  ip: string
  dangerScore: number
  dangerLevel: 'faible' | 'moyen' | 'eleve' | 'critique'
  estBloquee: boolean
  blocageInfo: BlockedIP | null
  resume: {
    totalEvents: number
    events24h: number
    events7j: number
    premiereApparition: string | null
    derniereApparition: string | null
  }
  repartitionTypes: { type: string; count: number }[]
  repartitionSeverite: { severite: string; count: number }[]
  empreinteNumerique: {
    navigateurs: { nom: string; count: number; dernierVu: string }[]
    os: { nom: string; count: number }[]
    appareils: { nom: string; count: number }[]
  }
  pathsCibles: { chemin: string; count: number; types: string[]; methodes: string[] }[]
  timelineHoraire: { _id: { date: string; hour: number }; count: number }[]
  derniersEvenements: SecurityEvent[]
}

// ============================================
// TYPES DETAIL EVENT
// ============================================

export interface SecurityEventDetail {
  event: SecurityEvent
  relatedEvents: SecurityEvent[]
  ipHistory: { _id: string; count: number; lastSeen: string }[]
  ipBlocked: boolean
  ipBlockedInfo: BlockedIP | null
}

// ============================================
// TYPES SANTE BACKEND (HEALTH CHECK)
// ============================================

export interface CollectionHealth {
  nom: string
  statut: 'ok' | 'erreur'
  documents: number
  latenceMs: number
  indexes: number
  indexManquants?: string[]
  erreur?: string
}

export interface IntegriteCheck {
  nom: string
  statut: 'ok' | 'alerte' | 'info'
  valeur: number
  description: string
}

export interface BackendHealth {
  score: number
  statut: 'sain' | 'degrade' | 'critique'
  timestamp: string
  dureeAnalyseMs: number
  problemes: string[]

  baseDeDonnees: {
    etat: string
    pingMs: number
    nom: string
    taille: string
    tailleIndex: string
    collections: number
    objets: number
  }

  collectionsDetails: CollectionHealth[]

  environnement: {
    requises: { nom: string; present: boolean; longueur: number }[]
    optionnelles: { nom: string; present: boolean }[]
    manquantes: string[]
  }

  systeme: {
    plateforme: string
    architecture: string
    nodeVersion: string
    uptime: {
      processus: number
      systeme: number
      formatProcessus: string
      formatSysteme: string
    }
    memoire: {
      rss: string
      heapTotal: string
      heapUsed: string
      external: string
      heapUsagePct: number
      rssRaw: number
      heapUsedRaw: number
      heapTotalRaw: number
    }
    cpus: number
    memoireSysteme: {
      total: string
      libre: string
      usagePct: number
    }
    pid: number
  }

  securiteEnCours: {
    evenementsHeure: number
    evenementsCritiquesHeure: number
    ipsBloquees: number
    attaquesNonBloquees: number
    injections24h: number
    bruteForce24h: number
    inscriptionsSuspectes24h: number
    derniersEvenements: SecurityEvent[]
  }

  integrite: IntegriteCheck[]
}

// ============================================
// SERVICE
// ============================================

export const securityService = {
  async getDashboard(): Promise<SecurityDashboardData> {
    const response = await api.get<ApiResponse<SecurityDashboardData>>(
      '/admin/security/dashboard'
    )
    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur de recuperation des donnees')
    }
    return response.data.data
  },

  async getEvents(params: {
    page?: number
    limit?: number
    type?: string
    severity?: string
    ip?: string
    blocked?: boolean
    dateDebut?: string
    dateFin?: string
  } = {}): Promise<{ data: SecurityEvent[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const response = await api.get('/admin/security/events', { params })
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Erreur')
    }
    return { data: response.data.data, pagination: response.data.pagination }
  },

  async getEventDetail(id: string): Promise<SecurityEventDetail> {
    const response = await api.get<ApiResponse<SecurityEventDetail>>(
      `/admin/security/events/${id}`
    )
    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur')
    }
    return response.data.data
  },

  async investigateIP(ip: string): Promise<IPInvestigation> {
    const response = await api.get<ApiResponse<IPInvestigation>>(
      `/admin/security/investigate/${encodeURIComponent(ip)}`
    )
    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur')
    }
    return response.data.data
  },

  async blockIP(ip: string, raison: string, duree?: number): Promise<BlockedIP> {
    const response = await api.post<ApiResponse<BlockedIP>>(
      '/admin/security/block-ip',
      { ip, raison, duree }
    )
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Erreur de blocage')
    }
    return response.data.data!
  },

  async unblockIP(id: string): Promise<void> {
    const response = await api.delete(`/admin/security/unblock-ip/${id}`)
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Erreur de deblocage')
    }
  },

  async getBlockedIPs(actif?: boolean): Promise<BlockedIP[]> {
    const params: Record<string, string> = {}
    if (actif !== undefined) params.actif = String(actif)
    const response = await api.get('/admin/security/blocked-ips', { params })
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Erreur')
    }
    return response.data.data
  },

  async banDevice(params: {
    userAgent: string; raison: string; duree?: number
    navigateur?: string; os?: string; appareil?: string; ipsConnues?: string[]
  }): Promise<BannedDevice> {
    const response = await api.post<ApiResponse<BannedDevice>>(
      '/admin/security/ban-device', params
    )
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Erreur de bannissement')
    }
    return response.data.data!
  },

  async unbanDevice(id: string): Promise<void> {
    const response = await api.delete(`/admin/security/unban-device/${id}`)
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Erreur de debannissement')
    }
  },

  async getBannedDevices(actif?: boolean): Promise<BannedDevice[]> {
    const params: Record<string, string> = {}
    if (actif !== undefined) params.actif = String(actif)
    const response = await api.get('/admin/security/banned-devices', { params })
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Erreur')
    }
    return response.data.data
  },

  async getBackendHealth(): Promise<BackendHealth> {
    const response = await api.get<ApiResponse<BackendHealth>>(
      '/admin/security/health'
    )
    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur de recuperation de la sante serveur')
    }
    return response.data.data
  },

  async purgeSecurityData(note?: string): Promise<{ archiveId: string; eventsSupprimes: number; ipsDebloquees: number; appareilsDebannis: number }> {
    const response = await api.delete<ApiResponse<{ archiveId: string; eventsSupprimes: number; ipsDebloquees: number; appareilsDebannis: number }>>(
      '/admin/security/purge',
      { data: { note } }
    )
    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur de purge')
    }
    return response.data.data
  },

  async getPurgeHistory(): Promise<PurgeHistoryItem[]> {
    const response = await api.get<ApiResponse<PurgeHistoryItem[]>>('/admin/security/purge-history')
    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur')
    }
    return response.data.data
  },

  async getPurgeDetail(id: string): Promise<PurgeDetail> {
    const response = await api.get<ApiResponse<PurgeDetail>>(`/admin/security/purge-history/${id}`)
    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur')
    }
    return response.data.data
  },

  async deletePurge(id: string): Promise<void> {
    const response = await api.delete(`/admin/security/purge-history/${id}`)
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Erreur de suppression')
    }
  },
}

export default securityService
