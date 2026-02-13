import api from './api'
import type { ApiResponse } from '@/types'

export interface SecurityDashboardData {
  securityScore: number
  alertLevel: 'normal' | 'elevated' | 'high' | 'critical'
  criticalReports: number
  highReports: number
  sanctions: {
    last24h: number
    last7d: number
  }
  surveillanceCount: number
  autoEscalations: number
  recentEscalations: Array<{
    _id: string
    targetType: string
    reason: string
    priority: string
    escalationReason: string
    escalatedAt: string
  }>
  recentBans: Array<{
    _id: string
    prenom: string
    nom: string
    avatar?: string
    bannedAt: string
    banReason?: string
  }>
  activeSuspensions: Array<{
    _id: string
    prenom: string
    nom: string
    avatar?: string
    suspendedUntil: string
    suspendReason?: string
  }>
  reportsByReason: Array<{ _id: string; count: number }>
  reportsTrend: Array<{
    _id: string
    count: number
    critical: number
    high: number
  }>
  moderatorActions: Array<{
    _id: string
    totalActions: number
    warns: number
    suspensions: number
    bans: number
    contentActions: number
    moderator: {
      _id: string
      prenom: string
      nom: string
      avatar?: string
    } | null
  }>
  topReportedUsers: Array<{
    _id: string
    count: number
    reasons: string[]
    maxPriority: string
    user: {
      _id: string
      prenom: string
      nom: string
      avatar?: string
      warnings?: Array<{ reason: string }>
      surveillance?: { active: boolean }
      bannedAt?: string
      suspendedUntil?: string
    } | null
  }>
  securityEvents: Array<{
    _id: string
    action: string
    actor?: { _id: string; prenom: string; nom: string }
    targetType?: string
    targetId?: string
    metadata?: Record<string, unknown>
    dateCreation: string
  }>
  recentActions: Array<{
    _id: string
    action: string
    actor?: { _id: string; prenom: string; nom: string; avatar?: string }
    targetType?: string
    targetId?: string
    metadata?: Record<string, unknown>
    dateCreation: string
  }>
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
