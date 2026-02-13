import api from './api'
import type { ApiResponse } from '@/types'

// Types pour les events de securite
export interface SecurityEvent {
  _id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  ip: string
  method: string
  path: string
  statusCode: number
  details: string
  blocked: boolean
  dateCreation: string
  metadata?: Record<string, unknown>
}

export interface SuspiciousIP {
  ip: string
  count: number
  types: string[]
  lastSeen: string
  maxSeverity: string
}

export interface OffenderIP {
  ip: string
  totalEvents: number
  criticalCount: number
  types: string[]
  firstSeen: string
  lastSeen: string
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

export interface SecurityDashboardData {
  threatLevel: 'normal' | 'elevated' | 'high' | 'critical'
  lastUpdated: string

  summary: {
    totalEvents24h: number
    totalEvents7j: number
    criticalEvents24h: number
    highEvents24h: number
    blockedEvents24h: number
    eventsPerHour: number
  }

  attackTypes: {
    brute_force: number
    injection_attempt: number
    rate_limit_hit: number
    unauthorized_access: number
    forbidden_access: number
    token_forgery: number
    suspicious_signup: number
    cors_violation: number
    anomaly: number
  }

  severityBreakdown: {
    critical: number
    high: number
    medium: number
    low: number
  }

  topSuspiciousIPs: SuspiciousIP[]
  recentEvents: SecurityEvent[]
  hourlyTrend: HourlyPoint[]
  dailyTrend: DailyPoint[]
  topAttackedPaths: AttackedPath[]
  criticalEvents: SecurityEvent[]
  topOffenderIPs: OffenderIP[]
}

export const securityService = {
  async getDashboard(): Promise<SecurityDashboardData> {
    const response = await api.get<ApiResponse<SecurityDashboardData>>(
      '/admin/security/dashboard'
    )

    if (!response.data.succes || !response.data.data) {
      throw new Error(
        response.data.message || 'Erreur de recuperation des donnees de securite'
      )
    }

    return response.data.data
  },
}

export default securityService
