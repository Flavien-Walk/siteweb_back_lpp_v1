// ============ UTILISATEUR ============

export type Role = 'user' | 'modo_test' | 'modo' | 'admin_modo' | 'super_admin'

export type Permission =
  | 'reports:view'
  | 'reports:process'
  | 'reports:escalate'
  | 'users:view'
  | 'users:warn'
  | 'users:suspend'
  | 'users:ban'
  | 'users:unban'
  | 'users:edit_roles'
  | 'content:hide'
  | 'content:delete'
  | 'content:edit'
  | 'audit:view'
  | 'audit:export'
  | 'config:view'
  | 'config:edit'
  | 'staff:chat'

export interface Warning {
  _id?: string
  reason: string
  moderator?: {
    _id: string
    prenom: string
    nom: string
  }
  date: string
  expiresAt?: string
}

export interface SurveillanceNote {
  _id?: string
  content: string
  author: {
    _id: string
    prenom: string
    nom: string
  }
  date: string
}

export interface Surveillance {
  active: boolean
  reason?: string
  addedBy?: {
    _id: string
    prenom: string
    nom: string
  }
  addedAt?: string
  notes: SurveillanceNote[]
}

export interface User {
  _id: string
  prenom: string
  nom: string
  email: string
  avatar?: string
  role: Role
  permissions: Permission[]
  status?: 'active' | 'suspended' | 'banned'
  bannedAt?: string | null
  banReason?: string
  suspendedUntil?: string | null
  suspendReason?: string
  warnings?: Warning[]
  dateCreation: string
  lastActive?: string
  publicationsCount?: number
  commentsCount?: number
  reportsCount?: number
  surveillance?: Surveillance
  reportsReceivedCount?: number
  riskScore?: number
  moderation?: {
    status: 'active' | 'suspended' | 'banned'
    warnCountSinceLastAutoSuspension: number
    autoSuspensionsCount: number
    lastAutoActionAt?: string
    updatedAt?: string
    riskScore?: number
  }
}

// ============ REPORTS ============

export type ReportTargetType = 'post' | 'commentaire' | 'utilisateur'

export type ReportReason =
  | 'spam'
  | 'harcelement'
  | 'contenu_inapproprie'
  | 'fausse_info'
  | 'nudite'
  | 'violence'
  | 'haine'
  | 'autre'

// Alias for backwards compatibility
export type ReportType = ReportReason

export type ReportStatus = 'pending' | 'reviewed' | 'action_taken' | 'dismissed'

export type ReportPriority = 'low' | 'medium' | 'high' | 'critical'

export interface ReportNote {
  _id?: string
  content: string
  author?: {
    _id: string
    prenom: string
    nom: string
  }
  dateCreation: string
}

export interface Report {
  _id: string
  reporter: {
    _id: string
    prenom: string
    nom: string
    avatar?: string
    email?: string
  }
  targetType: ReportTargetType
  targetId: string
  targetUser?: {
    _id: string
    prenom: string
    nom: string
    avatar?: string
    email?: string
    status?: 'active' | 'suspended' | 'banned'
  }
  targetContent?: string
  reason: ReportReason
  details?: string
  status: ReportStatus
  priority: ReportPriority
  assignedTo?: {
    _id: string
    prenom: string
    nom: string
  }
  processedBy?: {
    _id: string
    prenom: string
    nom: string
  }
  notes?: ReportNote[]
  duplicateCount?: number
  reportCount?: number
  target?: {
    _id: string
    auteur?: {
      _id: string
      prenom: string
      nom: string
      avatar?: string
    }
    contenu?: string
    media?: string[]
    dateCreation?: string
    isHidden?: boolean
  }
  escalatedAt?: string
  escalationReason?: string
  escalatedBy?: {
    _id: string
    prenom: string
    nom: string
  }
  moderatedBy?: {
    _id: string
    prenom: string
    nom: string
  }
  moderatedAt?: string
  adminNote?: string
  action?: string
  dateCreation: string
  dateMiseAJour?: string
  resolvedAt?: string
}

// ============ AUDIT LOGS ============

export type AuditAction =
  | 'user_warn'
  | 'user_suspend'
  | 'user_ban'
  | 'user_unban'
  | 'user_role_change'
  | 'report_approve'
  | 'report_reject'
  | 'report_escalate'
  | 'report_assign'
  | 'content_delete'
  | 'content_restore'
  | 'staff_chat'

export type AuditSource = 'web' | 'mobile' | 'api' | 'system'

export interface AuditLog {
  _id: string
  action: string
  moderator?: {
    _id: string
    prenom: string
    nom: string
    avatar?: string
    role?: string
  }
  targetUser?: {
    _id: string
    prenom: string
    nom: string
  }
  targetId?: string
  reason?: string
  metadata?: Record<string, unknown>
  source?: AuditSource
  dateCreation: string
}

// ============ USER TIMELINE / HISTORY ============

export interface TimelineEvent {
  _id: string
  type: 'warning' | 'suspension' | 'ban' | 'unban' | 'report_action' | 'role_change' | 'content_action'
  date: string
  reason?: string
  moderator?: {
    _id: string
    prenom: string
    nom: string
  }
  metadata?: Record<string, unknown>
}

export interface UserTimeline {
  events: TimelineEvent[]
  totalEvents: number
}

export interface UserAuditHistory {
  auditLogs: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface UserReport {
  _id: string
  targetType: ReportTargetType
  targetId: string
  reason: string
  status: ReportStatus
  dateCreation: string
  targetContent?: string
}

// ============ STAFF CHAT ============

export interface StaffMessage {
  _id: string
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

// ============ DASHBOARD ============

export interface AtRiskUser {
  _id: string
  prenom: string
  nom: string
  avatar?: string
  warnings?: Warning[]
  surveillance?: Surveillance
  moderation?: {
    status: string
    autoSuspensionsCount: number
  }
  suspendedUntil?: string | null
  dateCreation: string
  riskScore: number
  reportsReceivedCount: number
}

export interface SurveillanceUser {
  _id: string
  prenom: string
  nom: string
  avatar?: string
  surveillance: Surveillance
}

export interface DashboardStats {
  reports: {
    pending: number
    escalated: number
    byReason?: Array<{ _id: string; count: number }>
  }
  actionsToday: number
  users: {
    active: number
    banned: number
    suspended: number
  }
  surveillance: {
    count: number
    users: SurveillanceUser[]
  }
  contentStats: {
    publications: number
    commentaires: number
    projets: number
    stories: number
    lives: number
  }
  atRiskUsers: AtRiskUser[]
  recentActions: AuditLog[]
}

// ============ PAGINATION ============

export interface PaginatedResponse<T> {
  items: T[]
  currentPage: number
  totalPages: number
  totalCount: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

// ============ PUBLICATIONS ============

export type PublicationType = 'post' | 'annonce' | 'update' | 'editorial' | 'live-extrait'

export interface PublicationMedia {
  type: 'image' | 'video'
  url: string
  thumbnailUrl?: string
}

export interface Publication {
  _id: string
  auteur: {
    _id: string
    prenom: string
    nom: string
    avatar?: string
    email?: string
    role?: string
  }
  auteurType: 'Utilisateur' | 'Projet'
  type: PublicationType
  contenu: string
  media?: string
  medias: PublicationMedia[]
  likes: string[]
  likesCount: number
  nbCommentaires: number
  isHidden: boolean
  projet?: {
    _id: string
    nom: string
  }
  dateCreation: string
  dateMiseAJour: string
}

// ============ PROJETS ============

export type CategorieProjet = 'tech' | 'food' | 'sante' | 'education' | 'energie' | 'culture' | 'environnement' | 'autre'
export type MaturiteProjet = 'idee' | 'prototype' | 'lancement' | 'croissance'
export type StatutProjet = 'draft' | 'published'

export interface Projet {
  _id: string
  nom: string
  description: string
  pitch: string
  logo?: string
  categorie: CategorieProjet
  maturite: MaturiteProjet
  statut: StatutProjet
  isHidden: boolean
  hiddenReason?: string
  hiddenBy?: {
    _id: string
    prenom: string
    nom: string
  }
  hiddenAt?: string
  porteur: {
    _id: string
    prenom: string
    nom: string
    avatar?: string
    email?: string
  }
  equipe: {
    nom: string
    role: string
    utilisateur?: {
      _id: string
      prenom: string
      nom: string
      avatar?: string
    }
  }[]
  followers: string[]
  followersCount: number
  dateCreation: string
  dateMiseAJour: string
}

// ============ COMMENTAIRES ============

export interface Commentaire {
  _id: string
  publication: string | {
    _id: string
    contenu?: string
    auteur?: string
  }
  auteur: {
    _id: string
    prenom: string
    nom: string
    avatar?: string
    email?: string
  }
  contenu: string
  likes: string[]
  likesCount: number
  reponseA?: string
  modifie?: boolean
  editedBy?: {
    _id: string
    prenom: string
    nom: string
  }
  editReason?: string
  editedAt?: string
  dateCreation: string
  dateMiseAJour?: string
}

// ============ CONVERSATIONS ============

export interface ConversationParticipant {
  _id: string
  prenom: string
  nom: string
  avatar?: string
}

export interface ModerationConversation {
  _id: string
  participants: ConversationParticipant[]
  estGroupe: boolean
  nomGroupe?: string
  dernierMessage?: {
    contenuCrypte?: string
    type?: string
    dateCreation?: string
    expediteur?: string
  }
  dateCreation: string
  dateMiseAJour: string
}

export interface ConversationMessage {
  _id: string
  expediteur: {
    _id: string
    prenom: string
    nom: string
    avatar?: string
  }
  type: 'texte' | 'image' | 'video' | 'systeme'
  contenuCrypte: string
  contenu?: string
  dateCreation: string
}

// ============ LIVES ============

export interface Live {
  _id: string
  hostUserId: {
    _id: string
    prenom: string
    nom: string
    avatar?: string
    email?: string
  }
  channelName: string
  status: 'live' | 'ended'
  title?: string
  startedAt: string
  endedAt?: string
  viewerCount: number
  peakViewerCount: number
  dateCreation: string
}

// ============ EVENEMENTS ============

export type TypeEvenement = 'live' | 'replay' | 'qr'
export type StatutEvenement = 'a-venir' | 'en-cours' | 'termine'

export interface Evenement {
  _id: string
  titre: string
  description: string
  type: TypeEvenement
  projet?: {
    _id: string
    nom: string
  }
  date: string
  duree: number
  lienVideo?: string
  statut: StatutEvenement
  dateCreation: string
}

// ============ BROADCAST NOTIFICATIONS ============

export type BroadcastBadge = 'actu' | 'maintenance' | 'mise_a_jour' | 'evenement' | 'important'

export interface BroadcastNotification {
  _id: string
  titre: string
  message: string
  badge: BroadcastBadge
  sentBy: {
    _id: string
    prenom: string
    nom: string
    role: string
  }
  recipientCount: number
  dateCreation: string
}

// ============ API RESPONSES ============

export interface ApiResponse<T> {
  succes: boolean
  message?: string
  data?: T
  code?: string
  requiredPermission?: string
}

export interface ApiError {
  succes: false
  message: string
  code?: 'ACCOUNT_BANNED' | 'ACCOUNT_SUSPENDED' | string
  suspendedUntil?: string
  reason?: string
}
