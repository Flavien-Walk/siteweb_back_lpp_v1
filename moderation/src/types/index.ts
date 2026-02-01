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
  | 'audit:view'
  | 'audit:export'
  | 'config:view'
  | 'config:edit'
  | 'staff:chat'

export interface User {
  _id: string
  prenom: string
  nom: string
  email: string
  avatar?: string
  role: Role
  permissions: Permission[]
  bannedAt?: string | null
  banReason?: string
  suspendedUntil?: string | null
  warnings?: Warning[]
  dateCreation: string
}

export interface Warning {
  _id?: string
  reason: string
  issuedBy: string | { _id: string; prenom: string; nom: string }
  issuedAt: string
  expiresAt?: string
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

export type ReportStatus = 'pending' | 'reviewed' | 'action_taken' | 'dismissed'

export type ReportPriority = 'low' | 'medium' | 'high' | 'critical'

export type ReportAction =
  | 'none'
  | 'hide_post'
  | 'delete_post'
  | 'warn_user'
  | 'suspend_user'
  | 'ban_user'

export interface Report {
  _id: string
  reporter: {
    _id: string
    prenom: string
    nom: string
    avatar?: string
  }
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  details?: string
  status: ReportStatus
  priority: ReportPriority
  assignedTo?: {
    _id: string
    prenom: string
    nom: string
  }
  assignedAt?: string
  escalatedAt?: string
  escalatedBy?: {
    _id: string
    prenom: string
    nom: string
  }
  escalationReason?: string
  moderatedBy?: {
    _id: string
    prenom: string
    nom: string
  }
  moderatedAt?: string
  action?: ReportAction
  adminNote?: string
  aggregateCount?: number
  dateCreation: string
  dateMiseAJour: string
  // Enriched
  target?: ReportTarget
  reportCount?: number
}

export interface ReportTarget {
  _id: string
  type?: string
  auteur?: {
    _id: string
    prenom: string
    nom: string
    avatar?: string
  }
  contenu?: string
  media?: string[]
  isHidden?: boolean
  prenom?: string
  nom?: string
  avatar?: string
  dateCreation?: string
}

export interface AggregatedReport {
  targetType: ReportTargetType
  targetId: string
  target: ReportTarget | null
  reportCount: number
  reasons: ReportReason[]
  maxPriority: ReportPriority
  isEscalated: boolean
  firstReportDate: string
  lastReportDate: string
  reportIds: string[]
}

// ============ AUDIT LOGS ============

export type AuditAction =
  | 'user:warn'
  | 'user:warn_remove'
  | 'user:suspend'
  | 'user:unsuspend'
  | 'user:ban'
  | 'user:unban'
  | 'user:role_change'
  | 'user:permission_add'
  | 'user:permission_remove'
  | 'content:hide'
  | 'content:unhide'
  | 'content:delete'
  | 'content:restore'
  | 'report:process'
  | 'report:escalate'
  | 'report:dismiss'
  | 'report:assign'
  | 'config:update'
  | 'staff:login'
  | 'staff:logout'

export type AuditTargetType =
  | 'utilisateur'
  | 'publication'
  | 'commentaire'
  | 'message'
  | 'story'
  | 'live'
  | 'report'
  | 'config'
  | 'system'

export interface AuditLog {
  _id: string
  actor: {
    _id: string
    prenom: string
    nom: string
    avatar?: string
    role?: string
  }
  actorRole: string
  actorIp?: string
  action: AuditAction
  targetType: AuditTargetType
  targetId: string
  reason?: string
  metadata?: Record<string, unknown>
  snapshot?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  }
  relatedReport?: {
    _id: string
    targetType?: string
    reason?: string
    status?: string
  }
  dateCreation: string
}

// ============ STAFF CHAT ============

export type StaffMessageType = 'text' | 'system' | 'report_link'

export interface StaffMessage {
  _id: string
  sender: {
    _id: string
    prenom: string
    nom: string
    avatar?: string
    role?: string
  }
  type: StaffMessageType
  content: string
  linkedReport?: {
    _id: string
    targetType?: string
    reason?: string
    status?: string
  }
  readBy: string[]
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

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface PaginatedResponse<T> {
  succes: boolean
  data: {
    [key: string]: T[] | Pagination
    pagination: Pagination
  }
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
