import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { reportsService, type ReportListParams } from '@/services/reports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Flag,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  RefreshCw,
  X,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { ReportStatus, ReportType } from '@/types'

const statusLabels: Record<ReportStatus, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  escalated: 'Escaladé',
  resolved: 'Résolu',
  rejected: 'Rejeté',
}

const typeLabels: Record<ReportType, string> = {
  spam: 'Spam',
  harassment: 'Harcèlement',
  hate_speech: 'Discours haineux',
  inappropriate_content: 'Contenu inapproprié',
  copyright: 'Droits d\'auteur',
  other: 'Autre',
}

const priorityLabels: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  critical: 'Critique',
}

function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const variants: Record<ReportStatus, string> = {
    pending: 'warning',
    in_progress: 'default',
    escalated: 'escalated',
    resolved: 'success',
    rejected: 'secondary',
  }
  return (
    <Badge variant={variants[status] as never}>
      {statusLabels[status]}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const variants: Record<string, string> = {
    low: 'secondary',
    medium: 'default',
    high: 'warning',
    critical: 'destructive',
  }
  return (
    <Badge variant={variants[priority] as never} className="text-xs">
      {priorityLabels[priority]}
    </Badge>
  )
}

export function ReportsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  // Get params from URL
  const params: ReportListParams = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    status: (searchParams.get('status') as ReportStatus) || undefined,
    type: (searchParams.get('type') as ReportType) || undefined,
    priority: (searchParams.get('priority') as 'low' | 'medium' | 'high' | 'critical') || undefined,
    sort: searchParams.get('sort') || 'createdAt',
    order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
  }

  // Fetch reports
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reports', params],
    queryFn: () => reportsService.getReports(params),
  })

  // Quick actions mutation
  const processMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' | 'escalate' }) =>
      reportsService.processReport(id, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  // Update URL params
  const updateParams = (updates: Partial<ReportListParams>) => {
    const newParams = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        newParams.set(key, String(value))
      } else {
        newParams.delete(key)
      }
    })
    // Reset to page 1 when filters change
    if (!('page' in updates)) {
      newParams.set('page', '1')
    }
    setSearchParams(newParams)
  }

  const clearFilters = () => {
    setSearchParams({ page: '1', limit: '20' })
  }

  const hasActiveFilters = params.status || params.type || params.priority

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6" />
            Signalements
          </h1>
          <p className="text-muted-foreground">
            {data?.totalCount ?? 0} signalement(s) au total
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
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
                <label className="mb-1 block text-sm font-medium">Statut</label>
                <Select
                  value={params.status || ''}
                  onChange={(e) => updateParams({ status: e.target.value as ReportStatus || undefined })}
                >
                  <option value="">Tous</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <Select
                  value={params.type || ''}
                  onChange={(e) => updateParams({ type: e.target.value as ReportType || undefined })}
                >
                  <option value="">Tous</option>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Priorité</label>
                <Select
                  value={params.priority || ''}
                  onChange={(e) => updateParams({ priority: e.target.value as 'low' | 'medium' | 'high' | 'critical' || undefined })}
                >
                  <option value="">Toutes</option>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Tri</label>
                <Select
                  value={`${params.sort}-${params.order}`}
                  onChange={(e) => {
                    const [sort, order] = e.target.value.split('-')
                    updateParams({ sort, order: order as 'asc' | 'desc' })
                  }}
                >
                  <option value="createdAt-desc">Plus récents</option>
                  <option value="createdAt-asc">Plus anciens</option>
                  <option value="priority-desc">Priorité (haute)</option>
                  <option value="priority-asc">Priorité (basse)</option>
                </Select>
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
              Erreur lors du chargement des signalements
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reports table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contenu signalé</TableHead>
              <TableHead>Signalé par</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-16 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-32 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-5 w-20 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-5 w-16 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-8 w-24 animate-pulse rounded bg-muted ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  Aucun signalement trouvé
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((report) => (
                <TableRow key={report._id}>
                  <TableCell className="font-mono text-xs">
                    {report._id.slice(-8)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{typeLabels[report.type]}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="truncate text-sm">
                      {report.targetType === 'publication' ? 'Publication' :
                       report.targetType === 'commentaire' ? 'Commentaire' : 'Utilisateur'}
                    </p>
                    {report.reason && (
                      <p className="truncate text-xs text-muted-foreground">
                        {report.reason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {report.reporter ? (
                      <div className="flex items-center gap-2">
                        {report.reporter.avatar ? (
                          <img
                            src={report.reporter.avatar}
                            alt=""
                            className="h-6 w-6 rounded-full"
                          />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs">
                            {report.reporter.prenom?.[0]}
                          </div>
                        )}
                        <span className="text-sm">
                          {report.reporter.prenom} {report.reporter.nom?.[0]}.
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ReportStatusBadge status={report.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={report.priority} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatRelativeTime(report.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/reports/${report._id}`}>
                        <Button variant="ghost" size="icon" title="Voir détails">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {report.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Approuver"
                            onClick={() => processMutation.mutate({ id: report._id, action: 'approve' })}
                            disabled={processMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Rejeter"
                            onClick={() => processMutation.mutate({ id: report._id, action: 'reject' })}
                            disabled={processMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Escalader"
                            onClick={() => processMutation.mutate({ id: report._id, action: 'escalate' })}
                            disabled={processMutation.isPending}
                          >
                            <ArrowUpCircle className="h-4 w-4 text-warning" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {data.currentPage} sur {data.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateParams({ page: data.currentPage - 1 })}
                disabled={data.currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateParams({ page: data.currentPage + 1 })}
                disabled={data.currentPage >= data.totalPages}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default ReportsPage
