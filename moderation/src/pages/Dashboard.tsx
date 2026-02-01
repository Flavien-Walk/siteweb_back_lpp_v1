import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { dashboardService } from '@/services/dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Flag,
  AlertTriangle,
  Activity,
  Users,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'

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
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Bonjour, {user?.prenom} {user?.nom}
        </h1>
        <p className="text-muted-foreground">
          Voici un aperçu de l'activité de modération
        </p>
      </div>

      {/* Error state */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Erreur lors du chargement des statistiques
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Pending reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signalements en attente</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">{stats?.reports.pending ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground">À traiter</p>
          </CardContent>
        </Card>

        {/* Escalated reports */}
        <Card className={stats?.reports.escalated ? 'border-red-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signalements escaladés</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{stats?.reports.escalated ?? 0}</span>
                {stats?.reports.escalated ? (
                  <Badge variant="escalated">Urgent</Badge>
                ) : null}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Priorité élevée</p>
          </CardContent>
        </Card>

        {/* Actions today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions aujourd'hui</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">{stats?.actionsToday ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Actions de modération</p>
          </CardContent>
        </Card>

        {/* User stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-2xl font-bold text-green-600">
                    {stats?.users.active ?? 0}
                  </span>
                  <p className="text-xs text-muted-foreground">Actifs</p>
                </div>
                <div>
                  <span className="text-2xl font-bold text-amber-600">
                    {stats?.users.suspended ?? 0}
                  </span>
                  <p className="text-xs text-muted-foreground">Suspendus</p>
                </div>
                <div>
                  <span className="text-2xl font-bold text-red-600">
                    {stats?.users.banned ?? 0}
                  </span>
                  <p className="text-xs text-muted-foreground">Bannis</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Reports quick link */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Signalements
            </CardTitle>
            <CardDescription>
              Gérer les signalements de contenu et d'utilisateurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/reports">
              <Button className="w-full">
                Voir les signalements
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Users quick link */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Utilisateurs
            </CardTitle>
            <CardDescription>
              Rechercher et gérer les comptes utilisateurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/users">
              <Button className="w-full" variant="outline">
                Gérer les utilisateurs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Audit logs quick link */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Audit Logs
            </CardTitle>
            <CardDescription>
              Consulter l'historique des actions de modération
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/audit">
              <Button className="w-full" variant="outline">
                Voir les logs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Refresh indicator */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Actualisation automatique toutes les 30 secondes</span>
      </div>
    </div>
  )
}

export default DashboardPage
