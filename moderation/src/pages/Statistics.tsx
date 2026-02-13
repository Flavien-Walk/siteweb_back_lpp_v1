import { useQuery } from '@tanstack/react-query'
import { auditService } from '@/services/audit'
import { reportsService } from '@/services/reports'
import { dashboardService } from '@/services/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageTransition } from '@/components/PageTransition'
import {
  BarChart3,
  TrendingUp,
  Users,
  Flag,
  RefreshCw,
  AlertTriangle,
  Activity,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Labels & mappings
// ---------------------------------------------------------------------------

const actionLabels: Record<string, string> = {
  user_warn: 'Avertissement',
  user_suspend: 'Suspension',
  user_ban: 'Bannissement',
  user_unban: 'Debannissement',
  user_role_change: 'Changement de role',
  report_approve: 'Signalement approuve',
  report_reject: 'Signalement rejete',
  report_escalate: 'Signalement esclade',
  content_delete: 'Contenu supprime',
  content_restore: 'Contenu restaure',
  content_hide: 'Contenu masque',
  content_edit: 'Contenu modifie',
}

const reasonLabels: Record<string, string> = {
  spam: 'Spam',
  harcelement: 'Harcelement',
  contenu_inapproprie: 'Contenu inapproprie',
  fausse_info: 'Fausse information',
  nudite: 'Nudite',
  violence: 'Violence',
  haine: 'Discours haineux',
  autre: 'Autre',
}

const priorityLabels: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  critical: 'Critique',
}

const priorityVariants: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
}

const barColors: Record<string, string> = {
  user_warn: 'bg-amber-500',
  user_suspend: 'bg-orange-500',
  user_ban: 'bg-red-600',
  user_unban: 'bg-emerald-500',
  user_role_change: 'bg-blue-500',
  report_approve: 'bg-green-500',
  report_reject: 'bg-zinc-500',
  report_escalate: 'bg-red-500',
  content_delete: 'bg-red-400',
  content_restore: 'bg-teal-500',
  content_hide: 'bg-yellow-500',
  content_edit: 'bg-indigo-500',
}

const reasonColors: Record<string, string> = {
  spam: 'bg-zinc-500',
  harcelement: 'bg-red-500',
  contenu_inapproprie: 'bg-orange-500',
  fausse_info: 'bg-amber-500',
  nudite: 'bg-pink-500',
  violence: 'bg-red-600',
  haine: 'bg-purple-500',
  autre: 'bg-slate-500',
}

const priorityBarColors: Record<string, string> = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  critical: 'bg-red-500',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatisticsPage() {
  const {
    data: auditStats,
    isLoading: auditLoading,
    error: auditError,
    refetch: refetchAudit,
  } = useQuery({
    queryKey: ['statistics-audit'],
    queryFn: () => auditService.getStats(),
    refetchInterval: 60000,
  })

  const {
    data: reportStats,
    isLoading: reportLoading,
    error: reportError,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ['statistics-reports'],
    queryFn: () => reportsService.getStats(),
    refetchInterval: 60000,
  })

  const {
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ['statistics-dashboard'],
    queryFn: () => dashboardService.getStats(),
    refetchInterval: 60000,
  })

  const isLoading = auditLoading || reportLoading || dashboardLoading
  const hasError = auditError || reportError || dashboardError

  const refetchAll = () => {
    refetchAudit()
    refetchReports()
    refetchDashboard()
  }

  // Compute resolution rate
  const totalResolved =
    (reportStats?.byStatus?.action_taken ?? 0) + (reportStats?.byStatus?.dismissed ?? 0)
  const actionTaken = reportStats?.byStatus?.action_taken ?? 0
  const resolutionRate = totalResolved > 0 ? Math.round((actionTaken / totalResolved) * 100) : 0

  // Total reports (sum of all statuses)
  const totalReports = reportStats?.byStatus
    ? Object.values(reportStats.byStatus).reduce((sum, n) => sum + n, 0)
    : 0

  // Sorted actions for bar chart
  const sortedActions = auditStats?.byAction
    ? Object.entries(auditStats.byAction).sort(([, a], [, b]) => b - a)
    : []
  const maxActionCount = sortedActions.length > 0 ? sortedActions[0][1] : 1

  // Sorted reasons for bar chart
  const sortedReasons = reportStats?.byReason
    ? [...reportStats.byReason].sort((a, b) => b.count - a.count)
    : []
  const maxReasonCount = sortedReasons.length > 0 ? sortedReasons[0].count : 1

  // Sorted priorities for bar chart
  const sortedPriorities = reportStats?.byPriority
    ? Object.entries(reportStats.byPriority).sort(([, a], [, b]) => b - a)
    : []
  const maxPriorityCount = sortedPriorities.length > 0 ? sortedPriorities[0][1] : 1

  return (
    <PageTransition>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Statistiques
            </h1>
            <p className="text-muted-foreground">
              Vue d'ensemble de l'activite de moderation
            </p>
          </div>
          <Button variant="outline" onClick={refetchAll} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Error state */}
        {hasError && (
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-4 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">
                Erreur lors du chargement des statistiques
              </p>
              <Button variant="outline" size="sm" onClick={refetchAll}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reessayer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Key metric cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Actions today / this week */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actions aujourd'hui</CardTitle>
              <div className="rounded-md bg-emerald-500/10 p-2">
                <Activity className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              ) : (
                <div className="text-3xl font-bold tracking-tight">
                  {auditStats?.totalToday ?? 0}
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Cette semaine : {auditStats?.totalWeek ?? 0}
              </p>
            </CardContent>
          </Card>

          {/* Reports pending */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Signalements en attente</CardTitle>
              <div className="rounded-md bg-amber-500/10 p-2">
                <Flag className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              ) : (
                <div className="text-3xl font-bold tracking-tight">
                  {reportStats?.totalPending ?? 0}
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Total : {totalReports}
              </p>
            </CardContent>
          </Card>

          {/* Escalated */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Signalements escalades</CardTitle>
              <div className="rounded-md bg-red-500/10 p-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              ) : (
                <div className="text-3xl font-bold tracking-tight">
                  {reportStats?.totalEscalated ?? 0}
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">Priorite elevee</p>
            </CardContent>
          </Card>

          {/* Resolution rate */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux de resolution</CardTitle>
              <div className="rounded-md bg-blue-500/10 p-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              ) : (
                <div className="text-3xl font-bold tracking-tight">{resolutionRate}%</div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {actionTaken} action(s) / {totalResolved} resolu(s)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* By moderator + By action type */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Par moderateur */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-blue-400" />
                Par moderateur
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : auditStats?.byModerator && auditStats.byModerator.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-700/50">
                        <th className="pb-2 text-left font-medium text-muted-foreground">
                          Moderateur
                        </th>
                        <th className="pb-2 text-right font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditStats.byModerator.map((entry) => (
                        <tr
                          key={entry.moderator._id}
                          className="border-b border-zinc-800/50 last:border-0"
                        >
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                                {entry.moderator.prenom?.[0]}
                                {entry.moderator.nom?.[0]}
                              </div>
                              <span>
                                {entry.moderator.prenom} {entry.moderator.nom}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 text-right">
                            <Badge variant="secondary">{entry.count}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune donnee disponible
                </p>
              )}
            </CardContent>
          </Card>

          {/* Par type d'action */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                Par type d'action
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-6 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : sortedActions.length > 0 ? (
                <div className="space-y-3">
                  {sortedActions.map(([action, count]) => {
                    const pct = Math.max((count / maxActionCount) * 100, 2)
                    return (
                      <div key={action}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-zinc-300">
                            {actionLabels[action] || action}
                          </span>
                          <span className="font-medium text-zinc-100">{count}</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-zinc-800">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${barColors[action] || 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune donnee disponible
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* By reason + By priority */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Signalements par raison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flag className="h-4 w-4 text-orange-400" />
                Signalements par raison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-6 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : sortedReasons.length > 0 ? (
                <div className="space-y-3">
                  {sortedReasons.map((entry) => {
                    const pct = Math.max((entry.count / maxReasonCount) * 100, 2)
                    return (
                      <div key={entry._id}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-zinc-300">
                            {reasonLabels[entry._id] || entry._id}
                          </span>
                          <span className="font-medium text-zinc-100">{entry.count}</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-zinc-800">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${reasonColors[entry._id] || 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune donnee disponible
                </p>
              )}
            </CardContent>
          </Card>

          {/* Signalements par priorite */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Signalements par priorite
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-6 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : sortedPriorities.length > 0 ? (
                <div className="space-y-3">
                  {sortedPriorities.map(([priority, count]) => {
                    const pct = Math.max((count / maxPriorityCount) * 100, 2)
                    return (
                      <div key={priority}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <Badge variant={priorityVariants[priority] || 'secondary'}>
                            {priorityLabels[priority] || priority}
                          </Badge>
                          <span className="font-medium text-zinc-100">{count}</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-zinc-800">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${priorityBarColors[priority] || 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune donnee disponible
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  )
}

export default StatisticsPage
