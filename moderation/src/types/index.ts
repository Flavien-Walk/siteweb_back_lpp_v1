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
  | 'users:role'
  | 'users:edit_roles'
  | 'content:hide'
  | 'content:delete'
  | 'audit:view'
  | 'audit:export'
  | 'config:view'
  | 'config:edit'
  | 'staff:chat'
  | 'staff:admin'

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
  warnings?: Warning[]
  dateCreation: string
  lastActive?: string
  publicationsCount?: number
  commentsCount?: number
  reportsCount?: number
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

export interface DashboardStats {
  reports: {
    pending: number
    escalated: number
  }
  actionsToday: number
  users: {
    active: number
    banned: number
    suspended: number
  }
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
