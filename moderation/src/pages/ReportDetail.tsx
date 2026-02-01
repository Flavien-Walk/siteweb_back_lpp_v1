import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsService } from '@/services/reports'
import { useAuth } from '@/auth/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Flag,
  User,
  FileText,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  Send,
  ExternalLink,
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'
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

const targetTypeLabels: Record<string, string> = {
  publication: 'Publication',
  commentaire: 'Commentaire',
  utilisateur: 'Utilisateur',
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const variants: Record<ReportStatus, string> = {
    pending: 'warning',
    in_progress: 'default',
    escalated: 'escalated',
    resolved: 'success',
    rejected: 'secondary',
  }
  return <Badge variant={variants[status] as never}>{statusLabels[status]}</Badge>
}

function PriorityBadge({ priority }: { priority: string }) {
  const variants: Record<string, string> = {
    low: 'secondary',
    medium: 'default',
    high: 'warning',
    critical: 'destructive',
  }
  return <Badge variant={variants[priority] as never}>{priorityLabels[priority]}</Badge>
}

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()

  const [noteContent, setNoteContent] = useState('')
  const [actionReason, setActionReason] = useState('')

  // Fetch report details
  const {
    data: report,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsService.getReport(id!),
    enabled: !!id,
  })

  // Process mutation
  const processMutation = useMutation({
    mutationFn: ({ action }: { action: 'approve' | 'reject' | 'escalate' }) =>
      reportsService.processReport(id!, { action, reason: actionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setActionReason('')
    },
  })

  // Add note mutation
  const noteMutation = useMutation({
    mutationFn: (content: string) => reportsService.addNote(id!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] })
      setNoteContent('')
    },
  })

  const canProcess = hasPermission('reports:process')
  const canEscalate = hasPermission('reports:escalate')
  const isPending = report?.status === 'pending' || report?.status === 'in_progress'

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
            <Card><CardContent className="h-32 animate-pulse bg-muted" /></Card>
          </div>
          <div className="space-y-6">
            <Card><CardContent className="h-64 animate-pulse bg-muted" /></Card>
          </div>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="text-lg font-medium">Signalement non trouvé</p>
            <Button variant="outline" onClick={() => navigate('/reports')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux signalements
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/reports')} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div className="flex items-center gap-4">
          <Flag className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              Signalement #{report._id.slice(-8)}
              <StatusBadge status={report.status} />
              <PriorityBadge priority={report.priority} />
            </h1>
            <p className="text-muted-foreground">
              Créé {formatRelativeTime(report.dateCreation)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Détails du signalement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="font-medium">{typeLabels[report.type]}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contenu ciblé</p>
                  <p className="font-medium">{targetTypeLabels[report.targetType]}</p>
                </div>
              </div>
              {report.reason && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Raison</p>
                  <p className="mt-1 rounded-md bg-muted p-3">{report.reason}</p>
                </div>
              )}
              {report.targetContent && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contenu signalé</p>
                  <div className="mt-1 rounded-md border p-3">
                    <p className="whitespace-pre-wrap">{report.targetContent}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reporter info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Signalé par
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.reporter ? (
                <div className="flex items-center gap-4">
                  {report.reporter.avatar ? (
                    <img
                      src={report.reporter.avatar}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-medium">
                      {report.reporter.prenom?.[0]}{report.reporter.nom?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">
                      {report.reporter.prenom} {report.reporter.nom}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {report.reporter.email}
                    </p>
                  </div>
                  <Link to={`/users/${report.reporter._id}`} className="ml-auto">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Voir profil
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-muted-foreground">Utilisateur anonyme ou supprimé</p>
              )}
            </CardContent>
          </Card>

          {/* Target user */}
          {report.targetUser && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Utilisateur signalé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {report.targetUser.avatar ? (
                    <img
                      src={report.targetUser.avatar}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-lg font-medium">
                      {report.targetUser.prenom?.[0]}{report.targetUser.nom?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">
                      {report.targetUser.prenom} {report.targetUser.nom}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {report.targetUser.email}
                    </p>
                    {report.targetUser.status && report.targetUser.status !== 'active' && (
                      <Badge variant="destructive" className="mt-1">
                        {report.targetUser.status === 'suspended' ? 'Suspendu' : 'Banni'}
                      </Badge>
                    )}
                  </div>
                  <Link to={`/users/${report.targetUser._id}`} className="ml-auto">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Voir profil
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes / History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notes et historique
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add note */}
              <div className="mb-4 flex gap-2">
                <Input
                  placeholder="Ajouter une note..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && noteContent.trim()) {
                      noteMutation.mutate(noteContent)
                    }
                  }}
                />
                <Button
                  onClick={() => noteMutation.mutate(noteContent)}
                  disabled={!noteContent.trim() || noteMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Notes list */}
              <div className="space-y-3">
                {report.notes && report.notes.length > 0 ? (
                  report.notes.map((note, index) => (
                    <div key={index} className="rounded-md bg-muted p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {note.author?.prenom} {note.author?.nom}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(note.dateCreation)}
                        </span>
                      </div>
                      <p className="text-sm">{note.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune note pour le moment
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-6">
          {/* Quick actions */}
          {isPending && canProcess && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>
                  Traiter ce signalement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Raison (optionnel)"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                />
                <div className="grid gap-2">
                  <Button
                    className="w-full justify-start"
                    variant="default"
                    onClick={() => processMutation.mutate({ action: 'approve' })}
                    disabled={processMutation.isPending}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approuver (action requise)
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => processMutation.mutate({ action: 'reject' })}
                    disabled={processMutation.isPending}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeter (faux signalement)
                  </Button>
                  {canEscalate && (
                    <Button
                      className="w-full justify-start"
                      variant="destructive"
                      onClick={() => processMutation.mutate({ action: 'escalate' })}
                      disabled={processMutation.isPending}
                    >
                      <ArrowUpCircle className="mr-2 h-4 w-4" />
                      Escalader
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créé le</span>
                <span>{formatDate(report.dateCreation)}</span>
              </div>
              {report.dateMiseAJour && report.dateMiseAJour !== report.dateCreation && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mis à jour</span>
                  <span>{formatDate(report.dateMiseAJour)}</span>
                </div>
              )}
              {report.resolvedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Résolu le</span>
                  <span>{formatDate(report.resolvedAt)}</span>
                </div>
              )}
              {report.assignedTo && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigné à</span>
                  <span>
                    {report.assignedTo.prenom} {report.assignedTo.nom}
                  </span>
                </div>
              )}
              {report.processedBy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Traité par</span>
                  <span>
                    {report.processedBy.prenom} {report.processedBy.nom}
                  </span>
                </div>
              )}
              {report.duplicateCount && report.duplicateCount > 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Signalements similaires</span>
                  <Badge variant="warning">{report.duplicateCount}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ReportDetailPage
