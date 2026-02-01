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
  createdAt: string
  lastActive?: string
  publicationsCount?: number
  commentsCount?: number
  reportsCount?: number
}

// ============ REPORTS ============

export type ReportTargetType = 'publication' | 'commentaire' | 'utilisateur'

export type ReportType =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'inappropriate_content'
  | 'copyright'
  | 'other'

export type ReportStatus = 'pending' | 'in_progress' | 'escalated' | 'resolved' | 'rejected'

export type ReportPriority = 'low' | 'medium' | 'high' | 'critical'

export interface ReportNote {
  _id?: string
  content: string
  author?: {
    _id: string
    prenom: string
    nom: string
  }
  createdAt: string
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
  type: ReportType
  reason?: string
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
  createdAt: string
  updatedAt?: string
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
  createdAt: string
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
  createdAt: string
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
