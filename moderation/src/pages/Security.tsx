import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { securityService } from '@/services/security'
import type { SecurityDashboardData } from '@/services/security'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getActionLabel } from '@/lib/labels'
import { formatRelativeTime } from '@/lib/utils'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Users,
  Ban,
  Clock,
  Eye,
  Flame,
  Activity,
  UserX,
  Zap,
  BarChart3,
} from 'lucide-react'

// Labels des raisons de signalement
const reasonLabels: Record<string, string> = {
  spam: 'Spam',
  harcelement: 'Harcelement',
  contenu_inapproprie: 'Contenu inapproprie',
  fausse_info: 'Fausse information',
  nudite: 'Nudite',
  violence: 'Violence',
  haine: 'Haine',
  autre: 'Autre',
}

// Couleurs priorite
const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critique', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  high: { label: 'Haute', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  medium: { label: 'Moyenne', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  low: { label: 'Basse', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
}

// Couleurs niveau alerte
const alertConfig: Record<string, { label: string; icon: typeof ShieldCheck; color: string; bg: string; glow: string }> = {
  normal: { label: 'Normal', icon: ShieldCheck, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5', glow: 'shadow-emerald-500/20' },
  elevated: { label: 'Eleve', icon: Shield, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5', glow: 'shadow-amber-500/20' },
  high: { label: 'Haut', icon: ShieldAlert, color: 'text-orange-400', bg: 'from-orange-500/20 to-orange-500/5', glow: 'shadow-orange-500/20' },
  critical: { label: 'Critique', icon: Flame, color: 'text-red-400', bg: 'from-red-500/20 to-red-500/5', glow: 'shadow-red-500/20' },
}

function ScoreGauge({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : score >= 40 ? 'text-orange-400' : 'text-red-400'
  const strokeColor = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : score >= 40 ? '#fb923c' : '#f87171'
  const radius = size === 'lg' ? 60 : 30
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const svgSize = size === 'lg' ? 160 : 80

  return (
    <div className="relative flex items-center justify-center">
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={size === 'lg' ? 8 : 4}
        />
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={size === 'lg' ? 8 : 4}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className={`absolute flex flex-col items-center ${color}`}>
        <span className={size === 'lg' ? 'text-3xl font-bold' : 'text-lg font-bold'}>{score}</span>
        {size === 'lg' && <span className="text-xs opacity-60">/100</span>}
      </div>
    </div>
  )
}

function AlertBanner({ data }: { data: SecurityDashboardData }) {
  const config = alertConfig[data.alertLevel] || alertConfig.normal
  const Icon = config.icon

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-r ${config.bg} border-white/5 p-6 shadow-lg ${config.glow}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <ScoreGauge score={data.securityScore} />
          <div>
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${config.color}`} />
              <h2 className="text-lg font-semibold">
                Niveau d'alerte : <span className={config.color}>{config.label}</span>
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Score de securite global de la plateforme
            </p>
            <div className="mt-3 flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-red-400 font-medium">{data.criticalReports}</span> critique{data.criticalReports !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-orange-400 font-medium">{data.highReports}</span> haute{data.highReports !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400 font-medium">{data.sanctions.last24h}</span> sanction{data.sanctions.last24h !== 1 ? 's' : ''} (24h)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsCards({ data }: { data: SecurityDashboardData }) {
  const cards = [
    {
      label: 'Signalements critiques',
      value: data.criticalReports,
      icon: Flame,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Sanctions (24h)',
      value: data.sanctions.last24h,
      icon: Ban,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
    },
    {
      label: 'Sanctions (7j)',
      value: data.sanctions.last7d,
      icon: Activity,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Sous surveillance',
      value: data.surveillanceCount,
      icon: Eye,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Auto-escalades (7j)',
      value: data.autoEscalations,
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Suspensions actives',
      value: data.activeSuspensions.length,
      icon: UserX,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.label} className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ReportsTrendChart({ data }: { data: SecurityDashboardData['reportsTrend'] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Aucune donnee disponible</p>
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="space-y-3">
      {data.map((day) => {
        const date = new Date(day._id)
        const label = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
        const percent = (day.count / maxCount) * 100
        const criticalPercent = (day.critical / maxCount) * 100
        const highPercent = (day.high / maxCount) * 100

        return (
          <div key={day._id} className="flex items-center gap-3">
            <span className="w-24 text-xs text-muted-foreground shrink-0">{label}</span>
            <div className="flex-1 relative h-6 rounded-md bg-white/5 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary/30 rounded-md transition-all"
                style={{ width: `${percent}%` }}
              />
              {highPercent > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-orange-500/50 rounded-md"
                  style={{ width: `${highPercent}%` }}
                />
              )}
              {criticalPercent > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-red-500/60 rounded-md"
                  style={{ width: `${criticalPercent}%` }}
                />
              )}
              <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">
                {day.count}
              </span>
            </div>
          </div>
        )
      })}
      <div className="flex gap-4 text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-primary/30" /> Total</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-500/50" /> Haute</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500/60" /> Critique</span>
      </div>
    </div>
  )
}

function ReasonDistribution({ data }: { data: SecurityDashboardData['reportsByReason'] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Aucune donnee</p>
  }

  const total = data.reduce((sum, r) => sum + r.count, 0)
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-pink-500', 'bg-cyan-500']

  return (
    <div className="space-y-2.5">
      {data.map((reason, i) => {
        const percent = Math.round((reason.count / total) * 100)
        return (
          <div key={reason._id} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{reasonLabels[reason._id] || reason._id}</span>
              <span className="text-muted-foreground">{reason.count} ({percent}%)</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full ${colors[i % colors.length]} transition-all`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ModeratorActivity({ data }: { data: SecurityDashboardData['moderatorActions'] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Aucune activite</p>
  }

  return (
    <div className="space-y-3">
      {data.map((mod) => (
        <div key={mod._id || 'unknown'} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
            {mod.moderator ? `${mod.moderator.prenom?.[0] || ''}${mod.moderator.nom?.[0] || ''}` : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {mod.moderator ? `${mod.moderator.prenom} ${mod.moderator.nom}` : 'Inconnu'}
            </p>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>{mod.totalActions} actions</span>
              {mod.warns > 0 && <span className="text-amber-400">{mod.warns} avert.</span>}
              {mod.suspensions > 0 && <span className="text-orange-400">{mod.suspensions} susp.</span>}
              {mod.bans > 0 && <span className="text-red-400">{mod.bans} ban{mod.bans > 1 ? 's' : ''}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{mod.totalActions}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function TopReportedUsers({ data }: { data: SecurityDashboardData['topReportedUsers'] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Aucun utilisateur signale</p>
  }

  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((entry) => {
        const config = priorityConfig[entry.maxPriority] || priorityConfig.medium
        return (
          <div key={entry._id || 'unknown'} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs">
              {entry.user?.avatar ? (
                <img src={entry.user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                `${entry.user?.prenom?.[0] || '?'}${entry.user?.nom?.[0] || ''}`
              )}
            </div>
            <div className="flex-1 min-w-0">
              {entry.user ? (
                <Link to={`/users/${entry.user._id}`} className="text-sm font-medium truncate hover:text-primary transition-colors">
                  {entry.user.prenom} {entry.user.nom}
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">Utilisateur supprime</span>
              )}
              <div className="flex gap-1 flex-wrap mt-0.5">
                {entry.reasons.slice(0, 3).map((r) => (
                  <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">
                    {reasonLabels[r] || r}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <Badge variant="outline" className={`${config.bg} ${config.color} text-xs`}>
                {config.label}
              </Badge>
              <span className="text-lg font-bold">{entry.count}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SecurityEventsFeed({ data }: { data: SecurityDashboardData['securityEvents'] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Aucun evenement sensible (24h)</p>
  }

  const actionColors: Record<string, string> = {
    'user:ban': 'text-red-400',
    'user:unban': 'text-emerald-400',
    'user:suspend': 'text-orange-400',
    'user:unsuspend': 'text-teal-400',
    'user:change_role': 'text-blue-400',
    'content:delete': 'text-red-300',
    'user:surveillance_on': 'text-amber-400',
    'user:surveillance_off': 'text-gray-400',
  }

  return (
    <div className="space-y-1">
      {data.map((event) => (
        <div key={event._id} className="flex items-start gap-2 py-2 px-2 rounded hover:bg-white/5 transition-colors text-sm">
          <div className={`mt-0.5 h-1.5 w-1.5 rounded-full shrink-0 ${
            event.action.includes('ban') ? 'bg-red-400' :
            event.action.includes('suspend') ? 'bg-orange-400' :
            event.action.includes('delete') ? 'bg-red-300' :
            'bg-blue-400'
          }`} />
          <div className="flex-1 min-w-0">
            <span className={actionColors[event.action] || 'text-muted-foreground'}>
              {getActionLabel(event.action)}
            </span>
            {event.actor && (
              <span className="text-muted-foreground">
                {' '}par {event.actor.prenom} {event.actor.nom}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatRelativeTime(event.dateCreation)}
          </span>
        </div>
      ))}
    </div>
  )
}

function EscalationsFeed({ data }: { data: SecurityDashboardData['recentEscalations'] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Aucune escalade recente</p>
  }

  return (
    <div className="space-y-2">
      {data.slice(0, 10).map((esc) => {
        const config = priorityConfig[esc.priority] || priorityConfig.medium
        return (
          <div key={esc._id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <TrendingUp className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="capitalize">{esc.targetType}</span>
                {' - '}
                <span className={config.color}>{reasonLabels[esc.reason] || esc.reason}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {esc.escalationReason}
              </p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatRelativeTime(esc.escalatedAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function SecurityPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['security-dashboard'],
    queryFn: () => securityService.getDashboard(),
    refetchInterval: 30000,
    staleTime: 15000,
  })

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex h-[60vh] items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageTransition>
    )
  }

  if (error || !data) {
    return (
      <PageTransition>
        <div className="flex flex-col h-[60vh] items-center justify-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mb-2" />
          <p>Erreur lors du chargement des donnees de securite</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Reessayer
          </Button>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Securite
            </h1>
            <p className="text-muted-foreground">
              Monitoring de securite et detection des menaces
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>

        {/* Banniere alerte + score */}
        <AlertBanner data={data} />

        {/* Cartes stats */}
        <StatsCards data={data} />

        {/* Grille principale */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tendance signalements (7j) */}
          <Card className="border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Tendance des signalements
              </CardTitle>
              <CardDescription>7 derniers jours</CardDescription>
            </CardHeader>
            <CardContent>
              <ReportsTrendChart data={data.reportsTrend} />
            </CardContent>
          </Card>

          {/* Distribution par raison */}
          <Card className="border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Repartition des signalements
              </CardTitle>
              <CardDescription>30 derniers jours</CardDescription>
            </CardHeader>
            <CardContent>
              <ReasonDistribution data={data.reportsByReason} />
            </CardContent>
          </Card>

          {/* Evenements securite sensibles */}
          <Card className="border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-400" />
                Actions sensibles
              </CardTitle>
              <CardDescription>Dernières 24 heures</CardDescription>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto">
              <SecurityEventsFeed data={data.securityEvents} />
            </CardContent>
          </Card>

          {/* Escalades */}
          <Card className="border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                Escalades recentes
              </CardTitle>
              <CardDescription>7 derniers jours ({data.autoEscalations} auto-escalade{data.autoEscalations !== 1 ? 's' : ''})</CardDescription>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto">
              <EscalationsFeed data={data.recentEscalations} />
            </CardContent>
          </Card>

          {/* Utilisateurs les plus signales */}
          <Card className="border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-rose-400" />
                Utilisateurs les plus signales
              </CardTitle>
              <CardDescription>30 derniers jours</CardDescription>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto">
              <TopReportedUsers data={data.topReportedUsers} />
            </CardContent>
          </Card>

          {/* Activite moderateurs */}
          <Card className="border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                Activite des moderateurs
              </CardTitle>
              <CardDescription>7 derniers jours</CardDescription>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto">
              <ModeratorActivity data={data.moderatorActions} />
            </CardContent>
          </Card>
        </div>

        {/* Section bans et suspensions recents */}
        {(data.recentBans.length > 0 || data.activeSuspensions.length > 0) && (
          <div className="grid gap-6 lg:grid-cols-2">
            {data.recentBans.length > 0 && (
              <Card className="border-white/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Ban className="h-4 w-4 text-red-400" />
                    Bannissements recents
                  </CardTitle>
                  <CardDescription>30 derniers jours</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.recentBans.map((user) => (
                      <div key={user._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                        <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                          {user.avatar ? (
                            <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <Ban className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <Link to={`/users/${user._id}`} className="text-sm font-medium hover:text-primary">
                            {user.prenom} {user.nom}
                          </Link>
                          {user.banReason && (
                            <p className="text-xs text-muted-foreground truncate">{user.banReason}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(user.bannedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.activeSuspensions.length > 0 && (
              <Card className="border-white/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-400" />
                    Suspensions actives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.activeSuspensions.map((user) => (
                      <div key={user._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                        <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                          {user.avatar ? (
                            <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <Clock className="h-4 w-4 text-orange-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <Link to={`/users/${user._id}`} className="text-sm font-medium hover:text-primary">
                            {user.prenom} {user.nom}
                          </Link>
                          {user.suspendReason && (
                            <p className="text-xs text-muted-foreground truncate">{user.suspendReason}</p>
                          )}
                        </div>
                        <span className="text-xs text-orange-400">
                          Expire {formatRelativeTime(user.suspendedUntil)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  )
}

export default SecurityPage
