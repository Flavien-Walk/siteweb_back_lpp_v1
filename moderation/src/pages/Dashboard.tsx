import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/auth/AuthContext'
import { dashboardService } from '@/services/dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AnimatedCounter } from '@/components/AnimatedCounter'
import { WeeklyTrendChart, ReasonDistributionChart } from '@/components/charts/DashboardCharts'
import { PageTransition } from '@/components/PageTransition'
import {
  Flag,
  AlertTriangle,
  Activity,
  Users,
  Clock,
  ArrowRight,
  RefreshCw,
  Shield,
  Crown,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
  Flame,
  Headphones,
} from 'lucide-react'
import { RiskBadge } from '@/components/RiskBadge'

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
}

const roleStaggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

const roleStaggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
}

export function DashboardPage() {
  const { user } = useAuth()

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
    refetchInterval: 30000,
  })

  return (
    <PageTransition>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            Bonjour, {user?.prenom} {user?.nom}
          </h1>
          <p className="text-muted-foreground">
            Voici un apercu de l'activite de moderation
          </p>
        </div>

        {/* Error state */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-4 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">
                Erreur lors du chargement des statistiques
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reessayer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Animated stat cards */}
        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Pending reports */}
          <motion.div variants={staggerItem}>
            <Card className="relative overflow-hidden hover:border-primary/30 transition-all duration-300">
              <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Signalements en attente</CardTitle>
                <div className="rounded-md bg-primary/10 p-2">
                  <Flag className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <AnimatedCounter
                    value={stats?.reports.pending ?? 0}
                    className="text-3xl font-bold tracking-tight"
                  />
                )}
                <p className="mt-1 text-xs text-muted-foreground">A traiter</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Escalated reports */}
          <motion.div variants={staggerItem}>
            <Card
              className={`relative overflow-hidden transition-all duration-300 ${
                (stats?.reports.escalated ?? 0) > 0
                  ? 'border-red-500/50 shadow-[0_0_15px_rgba(255,77,109,0.15)] animate-pulse'
                  : 'hover:border-red-500/20'
              }`}
            >
              <div className="absolute inset-0 bg-linear-to-br from-red-500/5 to-transparent pointer-events-none" />
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
                  <div className="flex items-center gap-2">
                    <AnimatedCounter
                      value={stats?.reports.escalated ?? 0}
                      className="text-3xl font-bold tracking-tight"
                    />
                    {(stats?.reports.escalated ?? 0) > 0 && (
                      <Badge variant="escalated">Urgent</Badge>
                    )}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Priorite elevee</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions today */}
          <motion.div variants={staggerItem}>
            <Card className="relative overflow-hidden hover:border-emerald-500/20 transition-all duration-300">
              <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent pointer-events-none" />
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
                  <AnimatedCounter
                    value={stats?.actionsToday ?? 0}
                    className="text-3xl font-bold tracking-tight"
                  />
                )}
                <p className="mt-1 text-xs text-muted-foreground">Actions de moderation</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* User stats */}
          <motion.div variants={staggerItem}>
            <Card className="relative overflow-hidden hover:border-blue-500/20 transition-all duration-300">
              <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
                <div className="rounded-md bg-blue-500/10 p-2">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <div className="flex items-center gap-4">
                    <div>
                      <AnimatedCounter
                        value={stats?.users.active ?? 0}
                        className="text-2xl font-bold text-green-500"
                      />
                      <p className="text-xs text-muted-foreground">Actifs</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div>
                      <AnimatedCounter
                        value={stats?.users.suspended ?? 0}
                        className="text-2xl font-bold text-amber-500"
                      />
                      <p className="text-xs text-muted-foreground">Suspendus</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div>
                      <AnimatedCounter
                        value={stats?.users.banned ?? 0}
                        className="text-2xl font-bold text-red-500"
                      />
                      <p className="text-xs text-muted-foreground">Bannis</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Charts row */}
        <div className="grid gap-4 md:grid-cols-2">
          <WeeklyTrendChart />
          <ReasonDistributionChart data={stats?.reports.byReason} />
        </div>

        {/* Surveillance + At-Risk Users */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Surveillance Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-amber-400" />
                Surveillance ({stats?.surveillance?.count ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.surveillance?.users && stats.surveillance.users.length > 0 ? (
                <div className="space-y-3">
                  {stats.surveillance.users.map((u: any) => (
                    <Link
                      key={u._id}
                      to={`/users/${u._id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-medium text-amber-400">
                          {u.prenom?.[0]}{u.nom?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.prenom} {u.nom}</p>
                        {u.surveillance?.reason && (
                          <p className="text-xs text-zinc-500 truncate">{u.surveillance.reason}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                  {stats.surveillance.count > 5 && (
                    <Link to="/surveillance" className="text-xs text-primary hover:underline block text-center pt-2">
                      Voir tous ({stats.surveillance.count})
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun utilisateur sous surveillance</p>
              )}
            </CardContent>
          </Card>

          {/* At-Risk Users Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-4 w-4 text-red-400" />
                Utilisateurs a risque
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.atRiskUsers && stats.atRiskUsers.length > 0 ? (
                <div className="space-y-3">
                  {stats.atRiskUsers.map((u: any) => (
                    <Link
                      key={u._id}
                      to={`/users/${u._id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-xs font-medium text-red-400">
                          {u.prenom?.[0]}{u.nom?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.prenom} {u.nom}</p>
                        <p className="text-xs text-zinc-500">
                          {u.warnings?.length || 0} warn · {u.reportsReceivedCount || 0} reports
                        </p>
                      </div>
                      <RiskBadge score={u.riskScore} showLabel={false} />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun utilisateur a risque</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tickets Support + Content Stats + Recent Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Tickets Support */}
          <Card className="relative overflow-hidden hover:border-primary/30 transition-all duration-300">
            <div className="absolute inset-0 bg-linear-to-br from-cyan-500/5 to-transparent pointer-events-none" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Headphones className="h-4 w-4 text-cyan-400" />
                  Tickets Support
                </CardTitle>
                <Link to="/tickets" className="text-xs text-primary hover:underline">Voir tout</Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-10 animate-pulse rounded bg-muted" />
                  <div className="h-10 animate-pulse rounded bg-muted" />
                </div>
              ) : (
                <div className="space-y-3">
                  <Link to="/tickets?status=en_attente" className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                    <span className="text-sm text-amber-400">En attente</span>
                    <span className="text-2xl font-bold text-amber-400">{stats?.tickets?.enAttente ?? 0}</span>
                  </Link>
                  <Link to="/tickets?status=en_cours" className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                    <span className="text-sm text-blue-400">En cours</span>
                    <span className="text-2xl font-bold text-blue-400">{stats?.tickets?.enCours ?? 0}</span>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contenu de la plateforme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{stats?.contentStats?.publications ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Publications</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.contentStats?.commentaires ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Commentaires</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.contentStats?.projets ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Projets</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.contentStats?.stories ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Stories</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.contentStats?.lives ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Lives</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Actions recentes</CardTitle>
                <Link to="/audit" className="text-xs text-primary hover:underline">Voir tout</Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats?.recentActions && stats.recentActions.length > 0 ? (
                <div className="space-y-2">
                  {stats.recentActions.slice(0, 5).map((action: any) => (
                    <div key={action._id} className="flex items-center gap-3 text-sm p-2 rounded hover:bg-zinc-800/50">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{action.actor?.prenom} {action.actor?.nom}</span>
                        <span className="text-muted-foreground"> - </span>
                        <span className="text-xs text-zinc-400">{action.action}</span>
                      </div>
                      <span className="text-xs text-zinc-500 shrink-0">{new Date(action.dateCreation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune action recente</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {/* Reports quick link */}
          <motion.div variants={staggerItem}>
            <Card className="group hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="rounded-md bg-primary/10 p-1.5">
                    <Flag className="h-4 w-4 text-primary" />
                  </div>
                  Signalements
                </CardTitle>
                <CardDescription>
                  Gerer les signalements de contenu et d'utilisateurs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/reports">
                  <Button className="w-full group-hover:bg-primary/90 transition-colors">
                    Voir les signalements
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Users quick link */}
          <motion.div variants={staggerItem}>
            <Card className="group hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="rounded-md bg-blue-500/10 p-1.5">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  Utilisateurs
                </CardTitle>
                <CardDescription>
                  Rechercher et gerer les comptes utilisateurs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/users">
                  <Button className="w-full" variant="outline">
                    Gerer les utilisateurs
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Audit logs quick link */}
          <motion.div variants={staggerItem}>
            <Card className="group hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="rounded-md bg-emerald-500/10 p-1.5">
                    <Activity className="h-4 w-4 text-emerald-500" />
                  </div>
                  Audit Logs
                </CardTitle>
                <CardDescription>
                  Consulter l'historique des actions de moderation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/audit">
                  <Button className="w-full" variant="outline">
                    Voir les logs
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Staff Roles Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Guide des roles du staff
            </CardTitle>
            <CardDescription>
              Recapitulatif des roles, permissions et responsabilites de chaque membre du staff
            </CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
              variants={roleStaggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              {/* Modo Test */}
              <motion.div
                variants={roleStaggerItem}
                className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-4 hover:border-sky-500/50 transition-colors duration-300"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-sky-400" />
                  <h3 className="font-semibold text-sky-400">Moderateur Test</h3>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Role d'observation pour les nouveaux moderateurs en periode d'essai.
                </p>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Permissions :</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Voir les signalements</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <X className="h-3 w-3 text-red-500/50" />
                    <span className="text-muted-foreground">Traiter les signalements</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <X className="h-3 w-3 text-red-500/50" />
                    <span className="text-muted-foreground">Actions sur utilisateurs</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <X className="h-3 w-3 text-red-500/50" />
                    <span className="text-muted-foreground">Masquer/supprimer du contenu</span>
                  </div>
                </div>
              </motion.div>

              {/* Modo */}
              <motion.div
                variants={roleStaggerItem}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 hover:border-emerald-500/50 transition-colors duration-300"
              >
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-semibold text-emerald-400">Moderateur</h3>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Moderateur actif avec les outils essentiels de moderation au quotidien.
                </p>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Permissions :</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Voir et traiter les signalements</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Voir les utilisateurs</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Avertir les utilisateurs</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Masquer du contenu</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Staff Chat</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <X className="h-3 w-3 text-red-500/50" />
                    <span className="text-muted-foreground">Suspendre / Bannir</span>
                  </div>
                </div>
              </motion.div>

              {/* Admin */}
              <motion.div
                variants={roleStaggerItem}
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 hover:border-amber-500/50 transition-colors duration-300"
              >
                <div className="mb-3 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                  <h3 className="font-semibold text-amber-400">Administrateur</h3>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Acces etendu avec pouvoir de sanction et de gestion complete du contenu.
                </p>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Permissions :</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Toutes les permissions Moderateur</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Escalader les signalements</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Suspendre / Bannir / Debannir</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Supprimer du contenu</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Voir les audit logs</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <X className="h-3 w-3 text-red-500/50" />
                    <span className="text-muted-foreground">Modifier les roles</span>
                  </div>
                </div>
              </motion.div>

              {/* Fondateur */}
              <motion.div
                variants={roleStaggerItem}
                className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 hover:border-purple-500/50 transition-colors duration-300"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-purple-400" />
                  <h3 className="font-semibold text-purple-400">Fondateur</h3>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Acces total a la plateforme. Peut promouvoir et retrograder les membres du staff.
                </p>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Permissions :</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Toutes les permissions Administrateur</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Modifier les roles du staff</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Exporter les audit logs</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Voir et modifier la configuration</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>

        {/* Refresh indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Actualisation automatique toutes les 30 secondes</span>
        </div>
      </div>
    </PageTransition>
  )
}

export default DashboardPage
