import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { usersService } from '@/services/users'
import { PageTransition } from '@/components/PageTransition'
import { activityService } from '@/services/activity'
import { useAuth } from '@/auth/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  AlertTriangle,
  Ban,
  Clock,
  CheckCircle,
  History,
  Flag,
  FileText,
  Activity,
  ChevronRight,
  Share2,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { RiskBadge } from '@/components/RiskBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { User as UserType, TimelineEvent, AuditLog, UserReport } from '@/types'

const roleLabels: Record<string, string> = {
  user: 'Utilisateur',
  modo_test: 'Modérateur Test',
  modo: 'Modérateur',
  admin_modo: 'Administrateur',
  super_admin: 'Fondateur',
}

const timelineEventLabels: Record<string, string> = {
  warning: 'Avertissement',
  suspension: 'Suspension',
  ban: 'Bannissement',
  unban: 'Débannissement',
  report_action: 'Action de signalement',
  role_change: 'Changement de rôle',
  content_action: 'Action sur contenu',
}

const timelineEventIcons: Record<string, React.ReactNode> = {
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  suspension: <Clock className="h-4 w-4 text-orange-500" />,
  ban: <Ban className="h-4 w-4 text-red-500" />,
  unban: <CheckCircle className="h-4 w-4 text-green-500" />,
  report_action: <Flag className="h-4 w-4 text-blue-500" />,
  role_change: <Shield className="h-4 w-4 text-purple-500" />,
  content_action: <FileText className="h-4 w-4 text-gray-500" />,
}

type HistoryTab = 'timeline' | 'reports' | 'audit' | 'activity'

const activityTypeLabels: Record<string, string> = {
  publication: 'Publication',
  commentaire: 'Commentaire',
  report_sent: 'Signalement émis',
  sanction: 'Sanction reçue',
  share: 'Partage',
}

const activityTypeIcons: Record<string, React.ReactNode> = {
  publication: <FileText className="h-4 w-4 text-blue-500" />,
  commentaire: <FileText className="h-4 w-4 text-green-500" />,
  report_sent: <Flag className="h-4 w-4 text-orange-500" />,
  sanction: <AlertTriangle className="h-4 w-4 text-red-500" />,
  share: <Share2 className="h-4 w-4 text-indigo-500" />,
}

function UserStatusBadge({ user }: { user: UserType }) {
  if (user.bannedAt) {
    return <Badge variant="destructive">Banni</Badge>
  }
  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
    return <Badge variant="warning">Suspendu jusqu'au {formatDate(user.suspendedUntil)}</Badge>
  }
  return <Badge variant="success">Actif</Badge>
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission, user: currentUser } = useAuth()

  const [warnReason, setWarnReason] = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendDuration, setSuspendDuration] = useState('24')
  const [banReason, setBanReason] = useState('')
  const [newRole, setNewRole] = useState('')
  const [historyTab, setHistoryTab] = useState<HistoryTab>('timeline')
  const [activityFilter, setActivityFilter] = useState<'all' | 'share'>('all')
  const [surveillanceReason, setSurveillanceReason] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'warn' | 'suspend' | 'ban' | 'unban'; data?: any } | null>(null)

  // Fetch user
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersService.getUser(id!),
    enabled: !!id,
  })

  // Fetch timeline
  const { data: timeline, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ['user-timeline', id],
    queryFn: () => usersService.getUserTimeline(id!),
    enabled: !!id && historyTab === 'timeline',
  })

  // Fetch audit history
  const { data: auditHistory, isLoading: isLoadingAudit } = useQuery({
    queryKey: ['user-audit', id],
    queryFn: () => usersService.getUserAuditHistory(id!),
    enabled: !!id && historyTab === 'audit',
  })

  // Fetch user reports
  const { data: userReports, isLoading: isLoadingReports } = useQuery({
    queryKey: ['user-reports', id],
    queryFn: () => usersService.getUserReports(id!),
    enabled: !!id && historyTab === 'reports',
  })

  // Fetch user activity
  const { data: userActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['user-activity', id],
    queryFn: () => usersService.getUserActivity(id!),
    enabled: !!id && historyTab === 'activity' && activityFilter === 'all',
  })

  // Fetch share activities (from ActivityLog)
  const { data: shareActivity, isLoading: isLoadingShares } = useQuery({
    queryKey: ['user-shares', id],
    queryFn: () => activityService.getUserActivity(id!, { action: 'share', limit: 50 }),
    enabled: !!id && historyTab === 'activity' && activityFilter === 'share',
  })

  // Warn mutation
  const warnMutation = useMutation({
    mutationFn: (reason: string) => usersService.warnUser(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      setWarnReason('')
      toast.success('Avertissement envoyé')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de l\'envoi de l\'avertissement', { description: error.message })
    },
  })

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: ({ reason, durationHours }: { reason: string; durationHours: number }) =>
      usersService.suspendUser(id!, { reason, durationHours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setSuspendReason('')
      toast.success('Utilisateur suspendu')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la suspension', { description: error.message })
    },
  })

  // Ban mutation
  const banMutation = useMutation({
    mutationFn: (reason: string) => usersService.banUser(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setBanReason('')
      toast.success('Utilisateur banni')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors du bannissement', { description: error.message })
    },
  })

  // Unban mutation
  const unbanMutation = useMutation({
    mutationFn: () => usersService.unbanUser(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Utilisateur débanni')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors du débannissement', { description: error.message })
    },
  })

  // Role mutation
  const roleMutation = useMutation({
    mutationFn: (role: string) => usersService.updateRole(id!, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setNewRole('')
      toast.success('Rôle modifié avec succès')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la modification du rôle', { description: error.message })
    },
  })

  const toggleSurveillanceMutation = useMutation({
    mutationFn: ({ active, reason }: { active: boolean; reason?: string }) =>
      usersService.toggleSurveillance(id!, active, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      toast.success('Surveillance mise à jour')
    },
    onError: (error: Error) => {
      toast.error('Erreur', { description: error.message })
    },
  })

  const canWarn = hasPermission('users:warn')
  const canSuspend = hasPermission('users:suspend')
  const canBan = hasPermission('users:ban')
  const canModifyRole = hasPermission('users:edit_roles')

  const isStaffMember = user && ['modo_test', 'modo', 'admin_modo', 'super_admin'].includes(user.role)
  const isSelf = user && currentUser && user._id === currentUser._id

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="h-6 w-6 animate-pulse rounded bg-muted" />
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card><CardContent className="h-48 animate-pulse bg-muted" /></Card>
          </div>
          <div className="space-y-6">
            <Card><CardContent className="h-64 animate-pulse bg-muted" /></Card>
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="text-lg font-medium">Utilisateur non trouvé</p>
            <Button variant="outline" onClick={() => navigate('/users')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux utilisateurs
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <PageTransition>
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/users')} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-medium">
              {user.prenom?.[0]}{user.nom?.[0]}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {user.prenom} {user.nom}
              <UserStatusBadge user={user} />
              {(user.moderation?.riskScore ?? 0) > 0 && (
                <RiskBadge score={user.moderation?.riskScore ?? 0} />
              )}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {user.email}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID</p>
                  <p className="font-mono text-sm">{user._id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rôle</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.role === 'user' ? 'secondary' : 'default'}>
                      {roleLabels[user.role]}
                    </Badge>
                    {canModifyRole && !isSelf && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={newRole || user.role}
                          onChange={(e) => setNewRole(e.target.value)}
                          className="w-32"
                        >
                          {Object.entries(roleLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </Select>
                        {newRole && newRole !== user.role && (
                          <Button
                            size="sm"
                            onClick={() => roleMutation.mutate(newRole)}
                            disabled={roleMutation.isPending}
                          >
                            Modifier
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inscrit le</p>
                  <p>{formatDate(user.dateCreation)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dernière activité</p>
                  <p>{user.lastActive ? formatRelativeTime(user.lastActive) : 'Inconnue'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Avertissements ({user.warnings?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.warnings && user.warnings.length > 0 ? (
                <div className="space-y-3">
                  {user.warnings.map((warning, index) => (
                    <div key={index} className="rounded-md border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          Par {warning.moderator?.prenom} {warning.moderator?.nom}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(warning.date)}
                        </span>
                      </div>
                      <p className="text-sm">{warning.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun avertissement
                </p>
              )}
            </CardContent>
          </Card>

          {/* History section with tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique complet
              </CardTitle>
              <CardDescription>
                Timeline de modération, signalements et audit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Tabs */}
              <div className="flex gap-1 mb-4 border-b">
                <button
                  onClick={() => setHistoryTab('timeline')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    historyTab === 'timeline'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Activity className="h-4 w-4 inline mr-1" />
                  Actions de modération
                </button>
                <button
                  onClick={() => setHistoryTab('reports')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    historyTab === 'reports'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Flag className="h-4 w-4 inline mr-1" />
                  Reports émis
                </button>
                <button
                  onClick={() => setHistoryTab('audit')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    historyTab === 'audit'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText className="h-4 w-4 inline mr-1" />
                  Audit logs
                </button>
                <button
                  onClick={() => setHistoryTab('activity')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    historyTab === 'activity'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Activity className="h-4 w-4 inline mr-1" />
                  Activité complète
                </button>
              </div>

              {/* Timeline tab */}
              {historyTab === 'timeline' && (
                <div className="space-y-3">
                  {isLoadingTimeline ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 animate-pulse rounded bg-muted" />
                      ))}
                    </div>
                  ) : timeline?.events && timeline.events.length > 0 ? (
                    <div className="relative">
                      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-muted" />
                      {timeline.events.map((event: TimelineEvent, index: number) => (
                        <div key={event._id || index} className="relative pl-10 pb-4">
                          <div className="absolute left-2 top-1 p-1 bg-background rounded-full border">
                            {timelineEventIcons[event.type] || <Activity className="h-4 w-4" />}
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">
                                {timelineEventLabels[event.type] || event.type}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(event.date)}
                              </span>
                            </div>
                            {event.reason && (
                              <p className="text-sm text-muted-foreground">{event.reason}</p>
                            )}
                            {event.moderator && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Par {event.moderator.prenom} {event.moderator.nom}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucune action de modération
                    </p>
                  )}
                </div>
              )}

              {/* Reports tab */}
              {historyTab === 'reports' && (
                <div className="space-y-3">
                  {isLoadingReports ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 animate-pulse rounded bg-muted" />
                      ))}
                    </div>
                  ) : userReports?.reports && userReports.reports.length > 0 ? (
                    <>
                      {userReports.reports.map((report: UserReport) => (
                        <div
                          key={report._id}
                          className="rounded-md border p-3 hover:bg-muted/50 cursor-pointer"
                          onClick={() => navigate(`/reports/${report._id}`)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{report.targetType}</Badge>
                              <Badge
                                variant={
                                  report.status === 'action_taken' ? 'success' :
                                  report.status === 'dismissed' ? 'destructive' :
                                  'default'
                                }
                              >
                                {report.status}
                              </Badge>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-sm line-clamp-1">{report.reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(report.dateCreation)}
                          </p>
                        </div>
                      ))}
                      {userReports.pagination.totalPages > 1 && (
                        <p className="text-xs text-muted-foreground text-center">
                          {userReports.pagination.total} signalements au total
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun signalement émis par cet utilisateur
                    </p>
                  )}
                </div>
              )}

              {/* Audit tab */}
              {historyTab === 'audit' && (
                <div className="space-y-3">
                  {isLoadingAudit ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 animate-pulse rounded bg-muted" />
                      ))}
                    </div>
                  ) : auditHistory?.auditLogs && auditHistory.auditLogs.length > 0 ? (
                    <>
                      {auditHistory.auditLogs.map((log: AuditLog) => (
                        <div key={log._id} className="rounded-md border p-3">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline">{log.action}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(log.dateCreation)}
                            </span>
                          </div>
                          {log.reason && (
                            <p className="text-sm text-muted-foreground">{log.reason}</p>
                          )}
                          {log.moderator && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Par {log.moderator.prenom} {log.moderator.nom}
                            </p>
                          )}
                        </div>
                      ))}
                      {auditHistory.pagination.totalPages > 1 && (
                        <p className="text-xs text-muted-foreground text-center">
                          {auditHistory.pagination.total} entrées au total
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun audit log
                    </p>
                  )}
                </div>
              )}

              {/* Activity tab */}
              {historyTab === 'activity' && (
                <div className="space-y-4">
                  {/* Filter buttons */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={activityFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityFilter('all')}
                    >
                      <Activity className="h-4 w-4 mr-1" />
                      Tout
                    </Button>
                    <Button
                      variant={activityFilter === 'share' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityFilter('share')}
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Partages
                    </Button>
                  </div>

                  {/* All activity view */}
                  {activityFilter === 'all' && (
                    <>
                      {isLoadingActivity ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 animate-pulse rounded bg-muted" />
                          ))}
                        </div>
                      ) : userActivity ? (
                        <>
                          {/* Stats summary */}
                          <div className="grid grid-cols-4 gap-2 mb-4">
                            <div className="text-center p-2 bg-muted rounded">
                              <p className="text-lg font-semibold">{userActivity.stats.totalPublications}</p>
                              <p className="text-xs text-muted-foreground">Publications</p>
                            </div>
                            <div className="text-center p-2 bg-muted rounded">
                              <p className="text-lg font-semibold">{userActivity.stats.totalCommentaires}</p>
                              <p className="text-xs text-muted-foreground">Commentaires</p>
                            </div>
                            <div className="text-center p-2 bg-muted rounded">
                              <p className="text-lg font-semibold">{userActivity.stats.totalReportsSent}</p>
                              <p className="text-xs text-muted-foreground">Signalements</p>
                            </div>
                            <div className="text-center p-2 bg-muted rounded">
                              <p className="text-lg font-semibold">{userActivity.stats.totalSanctions}</p>
                              <p className="text-xs text-muted-foreground">Sanctions</p>
                            </div>
                          </div>

                          {/* Activity list */}
                          {userActivity.activities && userActivity.activities.length > 0 ? (
                            <div className="relative">
                              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-muted" />
                              {userActivity.activities.map((activity, index) => (
                                <div key={`${activity.type}-${index}`} className="relative pl-10 pb-4">
                                  <div className="absolute left-2 top-1 p-1 bg-background rounded-full border">
                                    {activityTypeIcons[activity.type] || <Activity className="h-4 w-4" />}
                                  </div>
                                  {activity.type === 'publication' && activity.data?._id ? (
                                    <Link to={`/publications/${String(activity.data._id)}`} className="block">
                                      <div className="rounded-md border p-3 hover:bg-muted/80 cursor-pointer transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                          <Badge variant="secondary">
                                            {activityTypeLabels[activity.type] || activity.type}
                                          </Badge>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">
                                              {formatRelativeTime(activity.date)}
                                            </span>
                                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                          </div>
                                        </div>
                                        {'contenu' in activity.data && (
                                          <p className="text-sm text-muted-foreground line-clamp-2">
                                            {String(activity.data.contenu)}
                                            {Boolean(activity.data.hasMedia) && (
                                              <span className="ml-1 text-blue-500">
                                                {' '}📎 {String(activity.data.mediaCount)} média(s)
                                              </span>
                                            )}
                                          </p>
                                        )}
                                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                          <ExternalLink className="h-3 w-3" /> Voir
                                        </p>
                                      </div>
                                    </Link>
                                  ) : activity.type === 'commentaire' ? (
                                    <div className={`rounded-md border p-3 ${activity.data?.publicationId ? 'hover:bg-muted/80 cursor-pointer transition-colors' : ''}`}>
                                      <div className="flex items-center justify-between mb-1">
                                        <Badge variant="secondary">
                                          {activityTypeLabels[activity.type] || activity.type}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {formatRelativeTime(activity.date)}
                                        </span>
                                      </div>
                                      {'contenu' in activity.data && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                          {String(activity.data.contenu)}
                                        </p>
                                      )}
                                      {activity.data && 'publicationId' in activity.data && Boolean(activity.data.publicationId) && (
                                        <Link to={`/publications/${String(activity.data.publicationId)}`} className="text-xs text-primary mt-1 flex items-center gap-1 hover:underline">
                                          <ExternalLink className="h-3 w-3" /> Voir la publication
                                        </Link>
                                      )}
                                    </div>
                                  ) : activity.type === 'report_sent' && activity.data?._id ? (
                                    <Link to={`/reports/${String(activity.data._id)}`} className="block">
                                      <div className="rounded-md border p-3 hover:bg-muted/80 cursor-pointer transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                          <Badge variant="secondary">
                                            {activityTypeLabels[activity.type] || activity.type}
                                          </Badge>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">
                                              {formatRelativeTime(activity.date)}
                                            </span>
                                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                          </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          {String(activity.data.reason)} ({String(activity.data.status)})
                                        </p>
                                      </div>
                                    </Link>
                                  ) : (
                                    <div className="rounded-md border p-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <Badge variant="secondary">
                                          {activityTypeLabels[activity.type] || activity.type}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {formatRelativeTime(activity.date)}
                                        </span>
                                      </div>
                                      {activity.type === 'publication' && 'contenu' in activity.data && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                          {String(activity.data.contenu)}
                                          {Boolean(activity.data.hasMedia) && (
                                            <span className="ml-1 text-blue-500">
                                              {' '}📎 {String(activity.data.mediaCount)} média(s)
                                            </span>
                                          )}
                                        </p>
                                      )}
                                      {activity.type === 'report_sent' && (
                                        <p className="text-sm text-muted-foreground">
                                          {String(activity.data.reason)} ({String(activity.data.status)})
                                        </p>
                                      )}
                                      {activity.type === 'sanction' && (
                                        <>
                                          <p className="text-sm font-medium text-red-600">
                                            {String(activity.data.action)}
                                          </p>
                                          {activity.data.reason && (
                                            <p className="text-sm text-muted-foreground">
                                              {String(activity.data.reason)}
                                            </p>
                                          )}
                                          {activity.data.moderator && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              Par {(activity.data.moderator as { prenom: string; nom: string }).prenom}{' '}
                                              {(activity.data.moderator as { prenom: string; nom: string }).nom}
                                            </p>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Aucune activité enregistrée
                            </p>
                          )}

                          {userActivity.pagination.pages > 1 && (
                            <p className="text-xs text-muted-foreground text-center">
                              {userActivity.pagination.total} activités au total
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Impossible de charger l'activité
                        </p>
                      )}
                    </>
                  )}

                  {/* Shares only view */}
                  {activityFilter === 'share' && (
                    <>
                      {isLoadingShares ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 animate-pulse rounded bg-muted" />
                          ))}
                        </div>
                      ) : shareActivity && shareActivity.activities.length > 0 ? (
                        <>
                          <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950 rounded mb-4">
                            <p className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
                              {shareActivity.pagination.total}
                            </p>
                            <p className="text-sm text-muted-foreground">Partages effectués</p>
                          </div>

                          <div className="relative">
                            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-indigo-200 dark:bg-indigo-800" />
                            {shareActivity.activities.map((activity, index) => (
                              <div key={activity._id || index} className="relative pl-10 pb-4">
                                <div className="absolute left-2 top-1 p-1 bg-background rounded-full border border-indigo-300">
                                  <Share2 className="h-4 w-4 text-indigo-500" />
                                </div>
                                <div className="rounded-md border border-indigo-200 dark:border-indigo-800 p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                                        Partage
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {activity.source}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {formatRelativeTime(activity.dateCreation)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {activity.targetType === 'publication' && activity.targetId ? (
                                      <>Publication ID: <Link to={`/publications/${activity.targetId}`} className="text-xs bg-muted px-1 rounded font-mono text-primary hover:underline">{activity.targetId}</Link></>
                                    ) : activity.targetType === 'publication' ? (
                                      <>Publication ID: <code className="text-xs bg-muted px-1 rounded">inconnu</code></>
                                    ) : null}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Rôle: {activity.actorRole}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {shareActivity.pagination.pages > 1 && (
                            <p className="text-xs text-muted-foreground text-center">
                              {shareActivity.pagination.total} partages au total
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucun partage enregistré
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-6">
          {/* Quick actions */}
          {!isStaffMember && !isSelf && (
            <Card>
              <CardHeader>
                <CardTitle>Actions de modération</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Warn */}
                {canWarn && !user.bannedAt && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Avertir</label>
                    <Input
                      placeholder="Raison de l'avertissement"
                      value={warnReason}
                      onChange={(e) => setWarnReason(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setConfirmDialog({ type: 'warn' })}
                      disabled={!warnReason.trim() || warnMutation.isPending}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Envoyer avertissement
                    </Button>
                  </div>
                )}

                {/* Suspend */}
                {canSuspend && !user.bannedAt && (
                  <div className="space-y-2 pt-4 border-t">
                    <label className="text-sm font-medium">Suspendre</label>
                    <Input
                      placeholder="Raison de la suspension"
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                    />
                    <Select
                      value={suspendDuration}
                      onChange={(e) => setSuspendDuration(e.target.value)}
                    >
                      <option value="1">1 heure</option>
                      <option value="6">6 heures</option>
                      <option value="24">24 heures</option>
                      <option value="72">3 jours</option>
                      <option value="168">7 jours</option>
                      <option value="720">30 jours</option>
                    </Select>
                    <Button
                      className="w-full"
                      variant="warning"
                      onClick={() => setConfirmDialog({ type: 'suspend' })}
                      disabled={!suspendReason.trim() || suspendMutation.isPending}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Suspendre
                    </Button>
                  </div>
                )}

                {/* Ban / Unban */}
                {canBan && (
                  <div className="space-y-2 pt-4 border-t">
                    {user.bannedAt ? (
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => setConfirmDialog({ type: 'unban' })}
                        disabled={unbanMutation.isPending}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Débannir
                      </Button>
                    ) : (
                      <>
                        <label className="text-sm font-medium text-destructive">Bannir définitivement</label>
                        <Input
                          placeholder="Raison du bannissement"
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                        />
                        <Button
                          className="w-full"
                          variant="destructive"
                          onClick={() => setConfirmDialog({ type: 'ban' })}
                          disabled={!banReason.trim() || banMutation.isPending}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Bannir définitivement
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Publications</span>
                <span>{user.publicationsCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commentaires</span>
                <span>{user.commentsCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Signalements émis</span>
                <span>{user.reportsCount ?? 0}</span>
              </div>
              {user.bannedAt && (
                <>
                  <div className="flex justify-between text-destructive">
                    <span>Banni le</span>
                    <span>{formatDate(user.bannedAt)}</span>
                  </div>
                  {user.banReason && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-sm">
                      <span className="font-medium text-destructive">Raison: </span>
                      <span className="text-muted-foreground">{user.banReason}</span>
                    </div>
                  )}
                </>
              )}
              {user.suspendedUntil && new Date(user.suspendedUntil) > new Date() && (
                <>
                  <div className="flex justify-between text-warning">
                    <span>Suspendu jusqu'au</span>
                    <span>{formatDate(user.suspendedUntil)}</span>
                  </div>
                  {user.suspendReason && (
                    <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950 rounded text-sm">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Raison: </span>
                      <span className="text-muted-foreground">{user.suspendReason}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Surveillance Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Surveillance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user?.surveillance?.active ? (
                <>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-sm font-medium text-amber-400 mb-1">Sous surveillance</p>
                    {user.surveillance.reason && (
                      <p className="text-xs text-zinc-400">{user.surveillance.reason}</p>
                    )}
                    {user.surveillance.addedBy && (
                      <p className="text-xs text-zinc-500 mt-1">
                        Par {user.surveillance.addedBy.prenom} {user.surveillance.addedBy.nom}
                      </p>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSurveillanceMutation.mutate({ active: false })}
                    disabled={toggleSurveillanceMutation.isPending}
                  >
                    <EyeOff className="mr-2 h-4 w-4" />
                    Retirer la surveillance
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Raison de la mise sous surveillance"
                    value={surveillanceReason}
                    onChange={(e) => setSurveillanceReason(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      toggleSurveillanceMutation.mutate({ active: true, reason: surveillanceReason })
                      setSurveillanceReason('')
                    }}
                    disabled={toggleSurveillanceMutation.isPending}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Mettre sous surveillance
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auto-escalation info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Auto-escalation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avertissements avant suspension</span>
                <span className="font-mono font-bold">
                  {user.moderation?.warnCountSinceLastAutoSuspension ?? 0} / 3
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all bg-amber-500"
                  style={{ width: `${Math.min(100, ((user.moderation?.warnCountSinceLastAutoSuspension ?? 0) / 3) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Suspensions auto passées</span>
                <span className="font-mono font-bold">{user.moderation?.autoSuspensionsCount ?? 0}</span>
              </div>
              {(user.moderation?.autoSuspensionsCount ?? 0) >= 1 && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                  Prochain seuil : bannissement auto (3e avertissement)
                </div>
              )}
              {(user.moderation?.autoSuspensionsCount ?? 0) === 0 && (user.moderation?.warnCountSinceLastAutoSuspension ?? 0) >= 2 && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
                  Attention : prochain avertissement déclenchera une suspension automatique de 7 jours
                </div>
              )}
            </CardContent>
          </Card>

          {/* Staff notice */}
          {isStaffMember && (
            <Card className="border-primary">
              <CardContent className="flex items-center gap-3 p-4">
                <Shield className="h-5 w-5 text-primary" />
                <p className="text-sm">
                  Cet utilisateur fait partie de l'équipe de modération.
                  Les actions de modération sont désactivées.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>

    <ConfirmDialog
      open={!!confirmDialog}
      title={
        confirmDialog?.type === 'warn' ? 'Confirmer l\'avertissement' :
        confirmDialog?.type === 'suspend' ? 'Confirmer la suspension' :
        confirmDialog?.type === 'ban' ? 'Bannissement définitif' :
        'Confirmer le débannissement'
      }
      description={
        confirmDialog?.type === 'ban' ? 'Cette action est DÉFINITIVE. L\'utilisateur ne pourra plus accéder à son compte.' :
        confirmDialog?.type === 'unban' ? 'Cette action rétablira l\'accès au compte de l\'utilisateur.' :
        undefined
      }
      variant={confirmDialog?.type === 'ban' ? 'destructive' : confirmDialog?.type === 'suspend' ? 'warning' : 'default'}
      confirmLabel={
        confirmDialog?.type === 'warn' ? 'Envoyer l\'avertissement' :
        confirmDialog?.type === 'suspend' ? 'Suspendre' :
        confirmDialog?.type === 'ban' ? 'Bannir définitivement' :
        'Débannir'
      }
      isLoading={warnMutation.isPending || suspendMutation.isPending || banMutation.isPending || unbanMutation.isPending}
      onConfirm={() => {
        if (confirmDialog?.type === 'warn') warnMutation.mutate(warnReason)
        else if (confirmDialog?.type === 'suspend') suspendMutation.mutate({ reason: suspendReason, durationHours: parseInt(suspendDuration) })
        else if (confirmDialog?.type === 'ban') banMutation.mutate(banReason)
        else if (confirmDialog?.type === 'unban') unbanMutation.mutate()
        setConfirmDialog(null)
      }}
      onCancel={() => setConfirmDialog(null)}
    />
    </PageTransition>
  )
}

export default UserDetailPage
