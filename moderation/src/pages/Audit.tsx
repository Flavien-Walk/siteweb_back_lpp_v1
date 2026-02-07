import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { auditService, type AuditListParams } from '@/services/audit'
import { PageTransition } from '@/components/PageTransition'
import { useAuth } from '@/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ScrollText,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Download,
  X,
  User,
  Shield,
  Ban,
  Flag,
  MessageSquare,
  Smartphone,
  Monitor,
  Globe,
  Server,
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'

const actionLabels: Record<string, string> = {
  user_warn: 'Avertissement',
  user_suspend: 'Suspension',
  user_ban: 'Bannissement',
  user_unban: 'Débannissement',
  user_role_change: 'Changement de rôle',
  report_approve: 'Signalement approuvé',
  report_reject: 'Signalement rejeté',
  report_escalate: 'Signalement escaladé',
  report_assign: 'Signalement assigné',
  content_delete: 'Contenu supprimé',
  content_restore: 'Contenu restauré',
  staff_chat: 'Message staff',
}

const actionIcons: Record<string, React.ReactNode> = {
  user_warn: <AlertTriangle className="h-4 w-4 text-warning" />,
  user_suspend: <Shield className="h-4 w-4 text-warning" />,
  user_ban: <Ban className="h-4 w-4 text-destructive" />,
  user_unban: <Shield className="h-4 w-4 text-success" />,
  user_role_change: <User className="h-4 w-4 text-primary" />,
  report_approve: <Flag className="h-4 w-4 text-success" />,
  report_reject: <Flag className="h-4 w-4 text-muted-foreground" />,
  report_escalate: <Flag className="h-4 w-4 text-destructive" />,
  report_assign: <Flag className="h-4 w-4 text-primary" />,
  content_delete: <X className="h-4 w-4 text-destructive" />,
  content_restore: <RefreshCw className="h-4 w-4 text-success" />,
  staff_chat: <MessageSquare className="h-4 w-4 text-primary" />,
}

const sourceLabels: Record<string, string> = {
  web: 'Web',
  mobile: 'Mobile',
  api: 'API',
  system: 'Système',
}

const sourceIcons: Record<string, React.ReactNode> = {
  web: <Monitor className="h-3.5 w-3.5" />,
  mobile: <Smartphone className="h-3.5 w-3.5" />,
  api: <Globe className="h-3.5 w-3.5" />,
  system: <Server className="h-3.5 w-3.5" />,
}

function SourceBadge({ source }: { source?: string }) {
  const src = source || 'web'
  return (
    <Badge variant="outline" className="gap-1 text-xs">
      {sourceIcons[src]}
      {sourceLabels[src] || src}
    </Badge>
  )
}

function ActionBadge({ action }: { action: string }) {
  const variants: Record<string, string> = {
    user_warn: 'warning',
    user_suspend: 'warning',
    user_ban: 'destructive',
    user_unban: 'success',
    user_role_change: 'default',
    report_approve: 'success',
    report_reject: 'secondary',
    report_escalate: 'escalated',
    report_assign: 'default',
    content_delete: 'destructive',
    content_restore: 'success',
    staff_chat: 'outline',
  }
  return (
    <Badge variant={variants[action] as never} className="gap-1">
      {actionIcons[action]}
      {actionLabels[action] || action}
    </Badge>
  )
}

export function AuditPage() {
  const { hasPermission } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  // Get params from URL
  const params: AuditListParams = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '50'),
    action: searchParams.get('action') || undefined,
    source: (searchParams.get('source') || undefined) as 'web' | 'mobile' | 'api' | 'system' | undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    sort: 'createdAt',
    order: 'desc',
  }

  // Fetch logs
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditService.getLogs(params),
  })

  // Update URL params
  const updateParams = (updates: Partial<AuditListParams>) => {
    const newParams = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        newParams.set(key, String(value))
      } else {
        newParams.delete(key)
      }
    })
    if (!('page' in updates)) {
      newParams.set('page', '1')
    }
    setSearchParams(newParams)
  }

  const clearFilters = () => {
    setSearchParams({ page: '1', limit: '50' })
  }

  const handleExport = async () => {
    try {
      const blob = await auditService.exportCsv({
        action: params.action,
        source: params.source,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const hasActiveFilters = params.action || params.source || params.dateFrom || params.dateTo
  const canExport = hasPermission('audit:export')

  return (
    <PageTransition>
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="h-6 w-6" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">
            Historique de toutes les actions de modération
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
          )}
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-3 w-3" />
                  Effacer
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Masquer' : 'Afficher'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Type d'action</label>
                <Select
                  value={params.action || ''}
                  onChange={(e) => updateParams({ action: e.target.value || undefined })}
                >
                  <option value="">Toutes</option>
                  {Object.entries(actionLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Source</label>
                <Select
                  value={params.source || ''}
                  onChange={(e) => updateParams({ source: (e.target.value || undefined) as 'web' | 'mobile' | 'api' | 'system' | undefined })}
                >
                  <option value="">Toutes</option>
                  <option value="web">Web (Modération)</option>
                  <option value="mobile">Mobile</option>
                  <option value="api">API</option>
                  <option value="system">Système</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Date début</label>
                <Input
                  type="date"
                  value={params.dateFrom || ''}
                  onChange={(e) => updateParams({ dateFrom: e.target.value || undefined })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Date fin</label>
                <Input
                  type="date"
                  value={params.dateTo || ''}
                  onChange={(e) => updateParams({ dateTo: e.target.value || undefined })}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Error state */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Erreur lors du chargement des logs
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Logs table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Modérateur</TableHead>
              <TableHead>Cible</TableHead>
              <TableHead>Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-5 w-28 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-16 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-40 animate-pulse rounded bg-muted" /></TableCell>
                </TableRow>
              ))
            ) : (data?.items?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Aucun log trouvé
                </TableCell>
              </TableRow>
            ) : (
              (data?.items ?? []).map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="text-sm">
                    <div>{formatDate(log.dateCreation)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatRelativeTime(log.dateCreation)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ActionBadge action={log.action} />
                  </TableCell>
                  <TableCell>
                    <SourceBadge source={log.source} />
                  </TableCell>
                  <TableCell>
                    {log.moderator ? (
                      <div className="flex items-center gap-2">
                        {log.moderator.avatar ? (
                          <img
                            src={log.moderator.avatar}
                            alt=""
                            className="h-6 w-6 rounded-full"
                          />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs">
                            {log.moderator.prenom?.[0]}
                          </div>
                        )}
                        <span className="text-sm">
                          {log.moderator.prenom} {log.moderator.nom?.[0]}.
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Système</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.targetUser ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {log.targetUser.prenom} {log.targetUser.nom}
                        </span>
                      </div>
                    ) : log.targetId ? (
                      <span className="font-mono text-xs text-muted-foreground">
                        {log.targetId.slice(-8)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    {log.reason && (
                      <p className="truncate text-sm text-muted-foreground" title={log.reason}>
                        {log.reason}
                      </p>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p className="truncate text-xs text-muted-foreground">
                        {JSON.stringify(log.metadata)}
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {data && (data.totalPages ?? 1) > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {data.currentPage ?? 1} sur {data.totalPages ?? 1} ({data.totalCount ?? 0} entrées)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateParams({ page: (data.currentPage ?? 1) - 1 })}
                disabled={(data.currentPage ?? 1) <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateParams({ page: (data.currentPage ?? 1) + 1 })}
                disabled={(data.currentPage ?? 1) >= (data.totalPages ?? 1)}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
    </PageTransition>
  )
}

export default AuditPage
